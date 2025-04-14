import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Pair } from './pair.entity';
import { HarvesterService } from '../harvester/harvester.service';
import { decimalsABI, symbolABI } from '../abis/erc20.abi';
import { PairCreatedEvent } from '../events/pair-created-event/pair-created-event.entity';
import { TokensByAddress } from '../token/token.service';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { PairCreatedEventService } from '../events/pair-created-event/pair-created-event.service';
import * as _ from 'lodash';
import { Deployment } from '../deployment/deployment.service';
import { PairQueryDto } from './pair.dto';
import { ActivityV2 } from '../activity/activity-v2.entity';

interface PairDictionaryItem {
  [address: string]: Pair;
}

export interface PairsDictionary {
  [address: string]: PairDictionaryItem;
}

@Injectable()
export class PairService {
  constructor(
    @InjectRepository(Pair) private pair: Repository<Pair>,
    @InjectRepository(ActivityV2) private activityRepository: Repository<ActivityV2>,
    private harvesterService: HarvesterService,
    private lastProcessedBlockService: LastProcessedBlockService,
    private pairCreatedEventService: PairCreatedEventService,
  ) {}

  async update(endBlock: number, tokens: TokensByAddress, deployment: Deployment): Promise<void> {
    const lastProcessedEntity = `${deployment.blockchainType}-${deployment.exchangeId}-pairs`;

    // figure out start block
    const lastProcessedBlockNumber = await this.lastProcessedBlockService.getOrInit(lastProcessedEntity, 1);

    // fetch pair created events
    const newEvents = await this.pairCreatedEventService.get(lastProcessedBlockNumber, endBlock, deployment);

    // create new pairs
    const eventBatches = _.chunk(newEvents, 1000);
    for (const eventsBatch of eventBatches) {
      await this.createFromEvents(eventsBatch, tokens, deployment);
      await this.lastProcessedBlockService.update(lastProcessedEntity, eventsBatch[eventsBatch.length - 1].block.id);
    }

    // update last processed block number
    await this.lastProcessedBlockService.update(lastProcessedEntity, endBlock);
  }

  async createFromEvents(events: PairCreatedEvent[], tokens: TokensByAddress, deployment: Deployment) {
    const pairs = [];
    events.forEach((e) => {
      if (!tokens[e.token1] || !tokens[e.token0]) {
        console.log('Token not found', e.token1, e.token0);
      }
      pairs.push(
        this.pair.create({
          token0: tokens[e.token0],
          token1: tokens[e.token1],
          name: `${tokens[e.token0].symbol}_${tokens[e.token1].symbol}`,
          block: e.block,
          blockchainType: deployment.blockchainType,
          exchangeId: deployment.exchangeId,
        }),
      );
    });

    await this.pair.save(pairs);
  }

  async getSymbols(addresses: string[], deployment: Deployment): Promise<string[]> {
    const symbols = await this.harvesterService.stringsWithMulticall(
      addresses,
      symbolABI,
      'symbol',
      deployment,
    );
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      symbols[index] = deployment.gasToken.symbol;
    }
    return symbols;
  }

  async getDecimals(addresses: string[], deployment: Deployment): Promise<number[]> {
    const decimals = await this.harvesterService.integersWithMulticall(
      addresses,
      decimalsABI,
      'decimals',
      deployment,
    );
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      decimals[index] = 18;
    }
    return decimals;
  }

  async all(deployment: Deployment): Promise<Pair[]> {
    return this.pair
      .createQueryBuilder('pair')
      .leftJoinAndSelect('pair.block', 'block')
      .leftJoinAndSelect('pair.token0', 'token0')
      .leftJoinAndSelect('pair.token1', 'token1')
      .where('pair.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .andWhere('pair.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .getMany();
  }

  async findWithFilters(deployment: Deployment, query: PairQueryDto): Promise<[Pair[], number]> {
    console.log('Finding pairs with filters:', {
      deployment,
      query,
      timestamp: new Date().toISOString()
    });

    try {
      const queryBuilder = this.pair
        .createQueryBuilder('pair')
        .leftJoinAndSelect('pair.token0', 'token0')
        .leftJoinAndSelect('pair.token1', 'token1')
        .leftJoin(
          ActivityV2,
          'activity',
          '(LOWER(activity.quoteBuyTokenAddress) = LOWER(token0.address) AND LOWER(activity.baseSellTokenAddress) = LOWER(token1.address)) OR ' +
          '(LOWER(activity.quoteBuyTokenAddress) = LOWER(token1.address) AND LOWER(activity.baseSellTokenAddress) = LOWER(token0.address))'
        )
        .select([
          'pair.id',
          'pair.exchangeId',
          'pair.blockchainType',
          'pair.name',
          'token0.id',
          'token0.address',
          'token0.symbol',
          'token1.id',
          'token1.address',
          'token1.symbol'
        ])
        .addSelect('COUNT(DISTINCT activity.id)', 'pair_activityCount')
        .addSelect('COUNT(DISTINCT activity.currentOwner)', 'pair_uniqueTraders')
        .addSelect('MAX(activity.timestamp)', 'pair_lastActivityTime')
        .addSelect('SUM(CASE WHEN activity.action = \'buy\' AND LOWER(activity.quoteBuyTokenAddress) = LOWER(token0.address) THEN CAST(activity.buyBudget AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token0_bought')
        .addSelect('SUM(CASE WHEN activity.action = \'sell\' AND LOWER(activity.baseSellTokenAddress) = LOWER(token0.address) THEN CAST(activity.sellBudget AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token0_sold')
        .addSelect('SUM(CASE WHEN LOWER(activity.feeToken) = LOWER(token0.address) THEN CAST(activity.fee AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token0_fees')
        .addSelect('SUM(CASE WHEN activity.action = \'buy\' AND LOWER(activity.quoteBuyTokenAddress) = LOWER(token1.address) THEN CAST(activity.buyBudget AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token1_bought')
        .addSelect('SUM(CASE WHEN activity.action = \'sell\' AND LOWER(activity.baseSellTokenAddress) = LOWER(token1.address) THEN CAST(activity.sellBudget AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token1_sold')
        .addSelect('SUM(CASE WHEN LOWER(activity.feeToken) = LOWER(token1.address) THEN CAST(activity.fee AS DECIMAL(78,0)) ELSE 0 END)', 'pair_token1_fees')
        .where('pair.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
        .andWhere('pair.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
        .groupBy('pair.id')
        .addGroupBy('pair.exchangeId')
        .addGroupBy('pair.blockchainType')
        .addGroupBy('pair.name')
        .addGroupBy('token0.id')
        .addGroupBy('token0.address')
        .addGroupBy('token0.symbol')
        .addGroupBy('token1.id')
        .addGroupBy('token1.address')
        .addGroupBy('token1.symbol');

      // Add time range filters if provided
      if (query.start) {
        queryBuilder.andWhere('activity.timestamp >= :start', { start: new Date(query.start * 1000) });
      }
      if (query.end) {
        queryBuilder.andWhere('activity.timestamp <= :end', { end: new Date(query.end * 1000) });
      }

      // Add owner filter if provided
      if (query.ownerId) {
        queryBuilder.andWhere('(activity.creationWallet = :ownerId OR activity.currentOwner = :ownerId)', {
          ownerId: query.ownerId,
        });
      }

      // Add pagination
      if (query.offset) {
        queryBuilder.offset(query.offset);
      }
      if (query.limit) {
        queryBuilder.limit(query.limit);
      }

      // Get both data and count
      const [pairs, total] = await queryBuilder.getManyAndCount();

      // Transform the raw results to include the aggregated fields
      const transformedPairs = pairs.map(pair => {
        const rawData = pair as any;
        return {
          ...pair,
          pair_activityCount: Number(rawData.pair_activityCount || 0),
          pair_uniqueTraders: Number(rawData.pair_uniqueTraders || 0),
          pair_lastActivityTime: rawData.pair_lastActivityTime ? new Date(rawData.pair_lastActivityTime) : null,
          pair_token0_bought: rawData.pair_token0_bought || '0',
          pair_token0_sold: rawData.pair_token0_sold || '0',
          pair_token0_fees: rawData.pair_token0_fees || '0',
          pair_token1_bought: rawData.pair_token1_bought || '0',
          pair_token1_sold: rawData.pair_token1_sold || '0',
          pair_token1_fees: rawData.pair_token1_fees || '0'
        };
      });

      return [transformedPairs, total];
    } catch (error) {
      console.error('Error in findWithFilters:', error);
      throw error;
    }
  }

  async allAsDictionary(deployment: Deployment): Promise<PairsDictionary> {
    const all = await this.all(deployment);
    const dictionary: PairsDictionary = {};
    all.forEach((p) => {
      if (!(p.token0.address in dictionary)) {
        dictionary[p.token0.address] = {};
      }
      if (!(p.token1.address in dictionary)) {
        dictionary[p.token1.address] = {};
      }
      dictionary[p.token0.address][p.token1.address] = p;
      dictionary[p.token1.address][p.token0.address] = p;
    });
    return dictionary;
  }
}
