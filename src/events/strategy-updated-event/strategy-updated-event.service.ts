import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { StrategyUpdatedEvent } from './strategy-updated-event.entity';
import { ContractsNames, CustomFnArgs, HarvesterService } from '../../harvester/harvester.service';
import { PairsDictionary } from '../../pair/pair.service';
import { TokensByAddress } from '../../token/token.service';
import { BigNumber } from '@ethersproject/bignumber';
import { Deployment } from '../../deployment/deployment.service';
import { TokensTradedEvent } from '../tokens-traded-event/tokens-traded-event.entity';
import { Decimal } from 'decimal.js';
import { calculateFeeFromTokensTradedEvent, parseOrder, processOrders } from '../../activity/activity.utils';
import { StrategyStatesMap } from '../../activity/activity.types';

@Injectable()
export class StrategyUpdatedEventService {
  private readonly logger = new Logger(StrategyUpdatedEventService.name);
  constructor(
    @InjectRepository(StrategyUpdatedEvent)
    private repository: Repository<StrategyUpdatedEvent>,
    @InjectRepository(TokensTradedEvent)
    private tokensTradedRepository: Repository<TokensTradedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async all(): Promise<StrategyUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('strategyUpdatedEvents')
      .leftJoinAndSelect('strategyUpdatedEvents.block', 'block')
      .leftJoinAndSelect('strategyUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('strategyUpdatedEvents.token0', 'token0')
      .leftJoinAndSelect('strategyUpdatedEvents.token1', 'token1')
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async update(
    endBlock: number,
    pairsDictionary: PairsDictionary,
    tokens: TokensByAddress,
    deployment: Deployment,
  ): Promise<any> {
    this.logger.log(
      `[update] Start strategy-updated-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    const res = await this.harvesterService.processEvents({
      entity: 'strategy-updated-events',
      contractName: ContractsNames.CarbonController,
      eventName: 'StrategyUpdated',
      endBlock,
      repository: this.repository,
      pairsDictionary,
      tokens,
      deployment,
      customFns: [this.parseEvent],
      numberFields: ['reason'],
      tagTimestampFromBlock: true,
    });
    this.logger.log(
      `[update] Completed strategy-updated-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
    return res;
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<StrategyUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('strategyUpdatedEvents')
      .leftJoinAndSelect('strategyUpdatedEvents.block', 'block')
      .leftJoinAndSelect('strategyUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('strategyUpdatedEvents.token0', 'token0')
      .leftJoinAndSelect('strategyUpdatedEvents.token1', 'token1')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('strategyUpdatedEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('strategyUpdatedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async parseEvent(args: CustomFnArgs): Promise<any> {
    const { event, rawEvent } = args;

    // parse id
    event['strategyId'] = BigNumber.from(rawEvent.returnValues['id']).toString();

    // parse orders
    for (let i = 0; i < 2; i++) {
      const key = `order${i}`;
      event[key] = JSON.stringify({
        y: BigNumber.from(rawEvent.returnValues[key]['y']).toString(),
        z: BigNumber.from(rawEvent.returnValues[key]['z']).toString(),
        A: BigNumber.from(rawEvent.returnValues[key]['A']).toString(),
        B: BigNumber.from(rawEvent.returnValues[key]['B']).toString(),
      });
    }

    return event;
  }

  async findTokensTradedEvent(strategyUpdatedEvent: StrategyUpdatedEvent): Promise<TokensTradedEvent | null> {
    // Find the TokensTradedEvent that occurred in the same transaction
    return this.tokensTradedRepository
      .createQueryBuilder('tokensTradedEvents')
      .leftJoinAndSelect('tokensTradedEvents.pair', 'pair')
      .leftJoinAndSelect('tokensTradedEvents.sourceToken', 'sourceToken')
      .leftJoinAndSelect('tokensTradedEvents.targetToken', 'targetToken')
      .where('tokensTradedEvents.transactionHash = :transactionHash', {
        transactionHash: strategyUpdatedEvent.transactionHash,
      })
      .andWhere('tokensTradedEvents.blockchainType = :blockchainType', {
        blockchainType: strategyUpdatedEvent.blockchainType,
      })
      .andWhere('tokensTradedEvents.exchangeId = :exchangeId', { exchangeId: strategyUpdatedEvent.exchangeId })
      .getOne();
  }

  async calculateFees(
    strategyUpdatedEvent: StrategyUpdatedEvent,
    strategyStates: StrategyStatesMap,
  ): Promise<{ fee: string; feeToken: string } | null> {
    // Only calculate fees for trade events (reason = 1)
    if (strategyUpdatedEvent.reason !== 1) {
      return null;
    }

    // Find the corresponding TokensTradedEvent
    const tokensTradedEvent = await this.findTokensTradedEvent(strategyUpdatedEvent);
    if (!tokensTradedEvent) {
      return null;
    }

    // Get the previous state
    const previousState = strategyStates.get(strategyUpdatedEvent.strategyId);
    if (!previousState) {
      return null;
    }

    // Process both current and previous orders
    const currentOrders = processOrders(
      parseOrder(strategyUpdatedEvent.order0),
      parseOrder(strategyUpdatedEvent.order1),
      new Decimal(strategyUpdatedEvent.token0.decimals),
      new Decimal(strategyUpdatedEvent.token1.decimals),
    );

    const prevOrders = processOrders(
      parseOrder(previousState.order0),
      parseOrder(previousState.order1),
      new Decimal(strategyUpdatedEvent.token0.decimals),
      new Decimal(strategyUpdatedEvent.token1.decimals),
    );

    // Calculate liquidity deltas
    const liquidity0Delta = currentOrders.liquidity0.minus(prevOrders.liquidity0);
    const liquidity1Delta = currentOrders.liquidity1.minus(prevOrders.liquidity1);

    // Calculate fees using the utility function
    return calculateFeeFromTokensTradedEvent(tokensTradedEvent, strategyUpdatedEvent, liquidity0Delta, liquidity1Delta);
  }
}
