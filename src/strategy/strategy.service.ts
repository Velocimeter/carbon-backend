import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(StrategyService.name);

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
    this.logger.log(`Starting strategy update for ${deployment.blockchainType}-${deployment.exchangeId} to block ${endBlock}`);
    
    // Process events to update
    await this.strategyCreatedEventService.update(endBlock, pairs, tokens, deployment);
    await this.strategyUpdatedEventService.update(endBlock, pairs, tokens, deployment);
    await this.strategyDeletedEventService.update(endBlock, pairs, tokens, deployment);

    // Get the last processed block number for this deployment
    const startBlock = await this.lastProcessedBlockService.getOrInit(
      `${deployment.blockchainType}-${deployment.exchangeId}-strategies`,
      deployment.startBlock,
    );
    
    this.logger.log(`Processing blocks from ${startBlock} to ${endBlock}`);

    // Process the events in ranges
    for (let block = startBlock; block <= endBlock; block += deployment.harvestEventsBatchSize * 10) {
      const rangeEnd = Math.min(block + deployment.harvestEventsBatchSize * 10 - 1, endBlock);
      
      this.logger.debug(`Processing block range ${block} to ${rangeEnd}`);

      // Fetch the events from the current block range
      const createdEvents = await this.strategyCreatedEventService.get(block, rangeEnd, deployment);
      const updatedEvents = await this.strategyUpdatedEventService.get(block, rangeEnd, deployment);
      const deletedEvents = await this.strategyDeletedEventService.get(block, rangeEnd, deployment);

      this.logger.debug(`Found events in range ${block}-${rangeEnd}: created=${createdEvents.length}, updated=${updatedEvents.length}, deleted=${deletedEvents.length}`);

      // Process the events
      await this.createOrUpdateFromEvents(createdEvents, deployment);
      await this.createOrUpdateFromEvents(updatedEvents, deployment);
      await this.createOrUpdateFromEvents(deletedEvents, deployment, true);

      // Update last processed block number for this deployment
      await this.lastProcessedBlockService.update(
        `${deployment.blockchainType}-${deployment.exchangeId}-strategies`,
        rangeEnd,
      );
    }
    
    this.logger.log(`Completed strategy update for ${deployment.blockchainType}-${deployment.exchangeId} to block ${endBlock}`);
  }

  async createOrUpdateFromEvents(
    events: StrategyCreatedEvent[] | StrategyUpdatedEvent[] | StrategyDeletedEvent[],
    deployment: Deployment,
    deletionEvent = false,
  ) {
    this.logger.debug(`Processing ${events.length} events for ${deployment.blockchainType}-${deployment.exchangeId}`);
    
    // Fetch existing strategies in the current block range
    const existingStrategies = await this.strategyRepository.find({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
    });

    this.logger.debug(`Found ${existingStrategies.length} existing strategies`);

    const strategies = [];
    events.forEach((e) => {
      const order0 = this.decodeOrder(JSON.parse(e.order0));
      const order1 = this.decodeOrder(JSON.parse(e.order1));
      const strategyIndex = existingStrategies.findIndex((s) => s.strategyId === e.strategyId);

      let newStrategy;
      if (strategyIndex >= 0) {
        this.logger.debug(`Updating existing strategy ${e.strategyId}`);
        // Update existing strategy
        newStrategy = existingStrategies[strategyIndex];
        newStrategy.token0 = e.token0;
        newStrategy.token1 = e.token1;
        newStrategy.block = e.block;
        newStrategy.pair = e.pair;
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
        this.logger.debug(`Creating new strategy ${e.strategyId}`);
        // Create new strategy
        newStrategy = this.strategyRepository.create({
          token0: e.token0,
          token1: e.token1,
          block: e.block,
          pair: e.pair,
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

      strategies.push(newStrategy);
    });

    const BATCH_SIZE = 1000;
    for (let i = 0; i < strategies.length; i += BATCH_SIZE) {
      const batch = strategies.slice(i, i + BATCH_SIZE);
      try {
        this.logger.debug(`Saving batch of ${batch.length} strategies`);
        await this.strategyRepository.save(batch);
      } catch (error) {
        if (error.message.includes('UQ_ca3ef6c54f8acf3f8acd7e14e32')) {
          this.logger.warn(`Encountered duplicate strategies in batch, processing one by one`);
          // Handle unique constraint violation by processing one by one
          for (const strategy of batch) {
            try {
              await this.strategyRepository.save(strategy);
            } catch (innerError) {
              if (!innerError.message.includes('UQ_ca3ef6c54f8acf3f8acd7e14e32')) {
                this.logger.error(`Error saving strategy: ${innerError.message}`, innerError.stack);
                throw innerError;
              }
              this.logger.debug(`Handling duplicate strategy ${strategy.strategyId}`);
              // If it's a duplicate, fetch and update the existing strategy
              const existing = await this.strategyRepository.findOne({
                where: {
                  blockchainType: strategy.blockchainType,
                  exchangeId: strategy.exchangeId,
                  strategyId: strategy.strategyId,
                },
              });
              if (existing) {
                Object.assign(existing, strategy);
                await this.strategyRepository.save(existing);
              }
            }
          }
        } else {
          this.logger.error(`Error saving strategies batch: ${error.message}`, error.stack);
          throw error;
        }
      }
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
