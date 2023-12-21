import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { PairTradingFeePpmUpdatedEvent } from './pair-trading-fee-ppm-updated-event.entity';
import { CustomFnArgs, HarvesterService } from '../../harvester/harvester.service';
import { PairsDictionary } from 'src/pair/pair.service';
import { TokensByAddress } from 'src/token/token.service';
import { BlocksDictionary } from '../../block/block.service';

@Injectable()
export class PairTradingFeePpmUpdatedEventService {
  constructor(
    @InjectRepository(PairTradingFeePpmUpdatedEvent)
    private repository: Repository<PairTradingFeePpmUpdatedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async all(): Promise<PairTradingFeePpmUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('pairTradingFeePpmUpdatedEvents')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.block', 'block')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.token0', 'token0')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.token1', 'token1')
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async update(
    endBlock: number,
    pairsDictionary: PairsDictionary,
    tokens: TokensByAddress,
    blocksDictionary: BlocksDictionary,
  ): Promise<any[]> {
    return this.harvesterService.processEvents({
      entity: 'pair-trading-fee-ppm-updated-events',
      contractName: 'CarbonController',
      eventName: 'PairTradingFeePPMUpdated',
      endBlock,
      repository: this.repository,
      pairsDictionary,
      tokens,
      customFns: [this.parseEvent],
      bigNumberFields: ['prevFeePPM', 'newFeePPM'],
      tagTimestampFromBlock: true,
      blocksDictionary,
    });
  }

  async get(startBlock: number, endBlock: number): Promise<PairTradingFeePpmUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('pairTradingFeePpmUpdatedEvents')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.block', 'block')
      .leftJoinAndSelect('pairTradingFeePpmUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('pair.token0', 'token0')
      .leftJoinAndSelect('pair.token1', 'token1')
      .where('block.id > :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async parseEvent(args: CustomFnArgs): Promise<any> {
    const { event, pairsDictionary } = args;

    event['pair'] = pairsDictionary[event['token0'].address][event['token1'].address];

    return event;
  }
}
