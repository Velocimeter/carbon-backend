import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Strategy } from './strategy.entity';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import Decimal from 'decimal.js';
import { StrategyCreatedEventService } from '../events/strategy-created-event/strategy-created-event.service';
import { StrategyUpdatedEventService } from '../events/strategy-updated-event/strategy-updated-event.service';
import { StrategyDeletedEventService } from '../events/strategy-deleted-event/strategy-deleted-event.service';
import { PairsDictionary } from '../pair/pair.service';
import { TokensByAddress } from '../token/token.service';
import { BigNumber } from '@ethersproject/bignumber';
import { Deployment } from '../deployment/deployment.service';
import { StrategyCreatedEvent } from '../events/strategy-created-event/strategy-created-event.entity';
import { StrategyUpdatedEvent } from '../events/strategy-updated-event/strategy-updated-event.entity';
import { StrategyDeletedEvent } from '../events/strategy-deleted-event/strategy-deleted-event.entity';

const ONE = 2 ** 48;

type DecodedOrder = {
  liquidity: string;
  lowestRate: string;
  highestRate: string;
  marginalRate: string;
};

type EncodedOrder = {
  y: string;
  z: string;
  A: string;
  B: string;
};

@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(Strategy) private strategyRepository: Repository<Strategy>,
    private lastProcessedBlockService: LastProcessedBlockService,
    private strategyCreatedEventService: StrategyCreatedEventService,
    private strategyUpdatedEventService: StrategyUpdatedEventService,
    private strategyDeletedEventService: StrategyDeletedEventService,
  ) {}

  async update(
    endBlock: number,
    pairs: PairsDictionary,
    tokens: TokensByAddress,
    deployment: Deployment,
  ): Promise<void> {
    console.log(`[Strategy Service] update start for ${deployment.blockchainType}-${deployment.exchangeId}, endBlock=${endBlock}`);
    // Process events to update
    await this.strategyCreatedEventService.update(endBlock, pairs, tokens, deployment);
    await this.strategyUpdatedEventService.update(endBlock, pairs, tokens, deployment);
    await this.strategyDeletedEventService.update(endBlock, pairs, tokens, deployment);

    // Get the last processed block number for this deployment
    const startBlock = await this.lastProcessedBlockService.getOrInit(
      `${deployment.blockchainType}-${deployment.exchangeId}-strategies`,
      deployment.startBlock,
    );
    console.log(`[Strategy Service] last-processed strategies startBlock=${startBlock} for ${deployment.blockchainType}-${deployment.exchangeId}`);

    // Process the events in ranges
    for (let block = startBlock + 1; block <= endBlock; block += deployment.harvestEventsBatchSize * 10) {
      const rangeEnd = Math.min(block + deployment.harvestEventsBatchSize * 10 - 1, endBlock);
      console.log(`[Strategy Service] processing block range ${block}-${rangeEnd} for ${deployment.blockchainType}-${deployment.exchangeId}`);

      // Fetch the events from the current block range
      const createdEvents = await this.strategyCreatedEventService.get(block, rangeEnd, deployment);
      const updatedEvents = await this.strategyUpdatedEventService.get(block, rangeEnd, deployment);
      const deletedEvents = await this.strategyDeletedEventService.get(block, rangeEnd, deployment);
      const minBlock = (arr: any[]) => (arr.length ? Math.min(...arr.map((e: any) => e.block?.id || Number.MAX_SAFE_INTEGER)) : null);
      const maxBlock = (arr: any[]) => (arr.length ? Math.max(...arr.map((e: any) => e.block?.id || 0)) : null);
      console.log(
        `[Strategy Service] fetched events c=${createdEvents.length} (min=${minBlock(createdEvents)} max=${maxBlock(createdEvents)}), ` +
          `u=${updatedEvents.length} (min=${minBlock(updatedEvents)} max=${maxBlock(updatedEvents)}), ` +
          `d=${deletedEvents.length} (min=${minBlock(deletedEvents)} max=${maxBlock(deletedEvents)}) for ${deployment.blockchainType}-${deployment.exchangeId}`,
      );

      // Process the events
      await this.createOrUpdateFromEvents(createdEvents, deployment);
      await this.createOrUpdateFromEvents(updatedEvents, deployment);
      await this.createOrUpdateFromEvents(deletedEvents, deployment, true);

      // Update last processed block number for this deployment
      await this.lastProcessedBlockService.update(
        `${deployment.blockchainType}-${deployment.exchangeId}-strategies`,
        rangeEnd,
      );
      console.log(`[Strategy Service] last-processed updated to ${rangeEnd} for ${deployment.blockchainType}-${deployment.exchangeId}`);
    }
  }

  async createOrUpdateFromEvents(
    events: StrategyCreatedEvent[] | StrategyUpdatedEvent[] | StrategyDeletedEvent[],
    deployment: Deployment,
    deletionEvent = false,
  ) {
    console.log(`[Strategy Service] Processing ${events.length} events for ${deployment.blockchainType}-${deployment.exchangeId}`);

    // Fetch existing strategies in the current block range
    const existingStrategies = await this.strategyRepository.find({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
    });

    console.log(`[Strategy Service] Found ${existingStrategies.length} existing strategies for ${deployment.blockchainType}-${deployment.exchangeId}`);
    


    // Double check for specific strategy if it exists
    // const problematicId = '340282366920938463463374607431768211459';
    // const doubleCheck = await this.strategyRepository.findOne({
    //   where: {
    //     blockchainType: deployment.blockchainType,
    //     exchangeId: deployment.exchangeId,
    //     strategyId: problematicId
    //   }
    // });
    // if (doubleCheck) {
    //   console.log(`[Strategy Service] Double check found strategy ${problematicId} exists:`, {
    //     id: doubleCheck.id,
    //     blockchainType: doubleCheck.blockchainType,
    //     exchangeId: doubleCheck.exchangeId,
    //     strategyId: doubleCheck.strategyId
    //   });
    // }

    const strategies = [];
    const processedStrategyIds = new Set(); // Track strategies we've processed in this batch

    events.forEach((e) => {
      // Log the exact values we're processing
      console.log(`[Strategy Service] Processing event for strategy:`, {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
        strategyId: e.strategyId,
        eventType: e.constructor.name,
        blockId: e.block?.id,
        pairId: (e as any).pair?.id,
        token0: (e as any).token0?.address,
        token1: (e as any).token1?.address,
      });

      // Check if we've already processed this strategy in current batch
      if (processedStrategyIds.has(e.strategyId)) {
        console.log(`[Strategy Service] WARNING: Duplicate strategy ID ${e.strategyId} found in current batch`);
        return; // Skip this one
      }

      let parsed0: any;
      let parsed1: any;
      try {
        parsed0 = JSON.parse((e as any).order0);
        parsed1 = JSON.parse((e as any).order1);
      } catch (err) {
        console.error(`[Strategy Service] ERROR parsing orders for strategy ${e.strategyId}:`, err, {
          order0: (e as any).order0,
          order1: (e as any).order1,
        });
        return;
      }
      console.log(`[Strategy Service] Decoded raw orders for ${e.strategyId}:`, {
        order0: parsed0,
        order1: parsed1,
      });
      const order0 = this.decodeOrder(parsed0);
      const order1 = this.decodeOrder(parsed1);
      const strategyIndex = existingStrategies.findIndex((s) => s.strategyId === e.strategyId);

      // Log the lookup result
      console.log(`[Strategy Service] Strategy lookup for ${e.strategyId}:`, {
        found: strategyIndex >= 0,
        eventType: e.constructor.name,
        existingStrategiesCount: existingStrategies.length,
        processedCount: processedStrategyIds.size
      });

      let newStrategy;
      if (strategyIndex >= 0) {
        // Update existing strategy
        console.log(`[Strategy Service] Updating strategy ${e.strategyId} for ${deployment.blockchainType}-${deployment.exchangeId} (Block: ${e.block?.id}, Pair: ${(e as any).pair?.id}, Deleted: ${deletionEvent})`);
        newStrategy = existingStrategies[strategyIndex];
        newStrategy.token0 = e.token0;
        newStrategy.token1 = e.token1;
        newStrategy.block = e.block;
        newStrategy.pair = (e as any).pair;
        newStrategy.liquidity0 = order0.liquidity;
        newStrategy.lowestRate0 = order0.lowestRate;
        newStrategy.highestRate0 = order0.highestRate;
        newStrategy.marginalRate0 = order0.marginalRate;
        newStrategy.liquidity1 = order1.liquidity;
        newStrategy.lowestRate1 = order1.lowestRate;
        newStrategy.highestRate1 = order1.highestRate;
        newStrategy.marginalRate1 = order1.marginalRate;
        newStrategy.deleted = deletionEvent;
      } else {
        // Create new strategy
        console.log(`[Strategy Service] Creating new strategy ${e.strategyId} for ${deployment.blockchainType}-${deployment.exchangeId} (Block: ${e.block?.id}, Pair: ${(e as any).pair?.id}, Deleted: ${deletionEvent}, Event Type: ${e.constructor.name})`);
        newStrategy = this.strategyRepository.create({
          token0: e.token0,
          token1: e.token1,
          block: e.block,
          pair: (e as any).pair,
          liquidity0: order0.liquidity,
          lowestRate0: order0.lowestRate,
          highestRate0: order0.highestRate,
          marginalRate0: order0.marginalRate,
          liquidity1: order1.liquidity,
          lowestRate1: order1.lowestRate,
          highestRate1: order1.highestRate,
          marginalRate1: order1.marginalRate,
          blockchainType: deployment.blockchainType,
          exchangeId: deployment.exchangeId,
          deleted: deletionEvent,
          strategyId: e.strategyId,
        });
      }

      processedStrategyIds.add(e.strategyId);
      strategies.push(newStrategy);
    });

    const BATCH_SIZE = 1000;
    for (let i = 0; i < strategies.length; i += BATCH_SIZE) {
      const batch = strategies.slice(i, i + BATCH_SIZE);
      console.log(`[Strategy Service] Saving batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(strategies.length/BATCH_SIZE)} (${batch.length} strategies) for ${deployment.blockchainType}-${deployment.exchangeId}`);
      try {
        await this.strategyRepository.save(batch);
        console.log(`[Strategy Service] Successfully saved batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      } catch (error) {
        // Enhanced error logging
        if (error.code === '23505') { // Unique constraint violation
          console.error(`[Strategy Service] Unique constraint violation details:`, {
            constraint: error.constraint,
            detail: error.detail,
            table: error.table,
            // Log the actual data that caused the violation
            batch: batch.map(s => ({
              blockchainType: s.blockchainType,
              exchangeId: s.exchangeId,
              strategyId: s.strategyId,
              eventType: s.constructor.name
            }))
          });
        }
        console.error(`[Strategy Service] Batch save error details (sample):`, {
          sample: batch[0] ? {
            blockchainType: batch[0].blockchainType,
            exchangeId: batch[0].exchangeId,
            strategyId: batch[0].strategyId,
            hasBlock: !!(batch[0] as any).block,
            hasPair: !!(batch[0] as any).pair,
            token0: (batch[0] as any).token0?.address,
            token1: (batch[0] as any).token1?.address,
          } : null,
        });
        console.error(`[Strategy Service] Error saving batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }
    if (strategies.length === 0) {
      console.log(`[Strategy Service] No strategies to save for ${deployment.blockchainType}-${deployment.exchangeId} in this batch`);
    }
  }

  async all(deployment: Deployment): Promise<Strategy[]> {
    const strategies = await this.strategyRepository
      .createQueryBuilder('pools')
      .leftJoinAndSelect('pools.block', 'block')
      .leftJoinAndSelect('pools.token0', 'token0')
      .leftJoinAndSelect('pools.token1', 'token1')
      .where('pools.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('pools.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .getMany();

    return strategies.sort((a, b) => b.block.id - a.block.id);
  }

  private decodeOrder(order: EncodedOrder): DecodedOrder {
    const y = new Decimal(order.y);
    const z = new Decimal(order.z);
    const A = new Decimal(this.decodeFloat(BigNumber.from(order.A)));
    const B = new Decimal(this.decodeFloat(BigNumber.from(order.B)));
    return {
      liquidity: y.toString(),
      lowestRate: this.decodeRate(B).toString(),
      highestRate: this.decodeRate(B.add(A)).toString(),
      marginalRate: this.decodeRate(y.eq(z) ? B.add(A) : B.add(A.mul(y).div(z))).toString(),
    };
  }

  private decodeRate(value: Decimal) {
    return value.div(ONE).pow(2);
  }

  private decodeFloat(value: BigNumber) {
    return value.mod(ONE).shl(value.div(ONE).toNumber()).toString();
  }
}
