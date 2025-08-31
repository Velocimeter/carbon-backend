import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { StrategyCreatedEvent } from './strategy-created-event.entity';
import { ContractsNames, CustomFnArgs, HarvesterService } from '../../harvester/harvester.service';
import { PairsDictionary } from '../../pair/pair.service';
import { TokensByAddress } from '../../token/token.service';
import { BigNumber } from '@ethersproject/bignumber';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class StrategyCreatedEventService {
  private readonly logger = new Logger(StrategyCreatedEventService.name);
  constructor(
    @InjectRepository(StrategyCreatedEvent)
    private repository: Repository<StrategyCreatedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async update(
    endBlock: number,
    pairsDictionary: PairsDictionary,
    tokens: TokensByAddress,
    deployment: Deployment,
  ): Promise<any> {
    this.logger.log(
      `[update] Start strategy-created-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    const res = await this.harvesterService.processEvents({
      entity: 'strategy-created-events',
      contractName: ContractsNames.CarbonController,
      eventName: 'StrategyCreated',
      endBlock,
      repository: this.repository,
      pairsDictionary,
      tokens,
      customFns: [this.parseEvent],
      tagTimestampFromBlock: true,
      deployment,
    });
    this.logger.log(
      `[update] Completed strategy-created-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
    return res;
  }

  async all(deployment: Deployment): Promise<StrategyCreatedEvent[]> {
    return this.repository
      .createQueryBuilder('strategyCreatedEvents')
      .leftJoinAndSelect('strategyCreatedEvents.block', 'block')
      .leftJoinAndSelect('strategyCreatedEvents.pair', 'pair')
      .leftJoinAndSelect('strategyCreatedEvents.token0', 'token0')
      .leftJoinAndSelect('strategyCreatedEvents.token1', 'token1')
      .where('strategyCreatedEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('strategyCreatedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<StrategyCreatedEvent[]> {
    return this.repository
      .createQueryBuilder('strategyCreatedEvents')
      .leftJoinAndSelect('strategyCreatedEvents.block', 'block')
      .leftJoinAndSelect('strategyCreatedEvents.pair', 'pair')
      .leftJoinAndSelect('strategyCreatedEvents.token0', 'token0')
      .leftJoinAndSelect('strategyCreatedEvents.token1', 'token1')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('strategyCreatedEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('strategyCreatedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async getOne(id: string) {
    return this.repository
      .createQueryBuilder('strategyCreatedEvents')
      .leftJoinAndSelect('strategyCreatedEvents.block', 'block')
      .leftJoinAndSelect('strategyCreatedEvents.pair', 'pair')
      .leftJoinAndSelect('strategyCreatedEvents.token0', 'token0')
      .leftJoinAndSelect('strategyCreatedEvents.token1', 'token1')
      .where('strategyCreatedEvents.id = :id', { id })
      .getOne();
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
}
