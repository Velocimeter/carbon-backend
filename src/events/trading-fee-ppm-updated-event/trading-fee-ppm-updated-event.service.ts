import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { TradingFeePpmUpdatedEvent } from './trading-fee-ppm-updated-event.entity';
import { ContractsNames, HarvesterService } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class TradingFeePpmUpdatedEventService {
  private readonly logger = new Logger(TradingFeePpmUpdatedEventService.name);
  constructor(
    @InjectRepository(TradingFeePpmUpdatedEvent)
    private repository: Repository<TradingFeePpmUpdatedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async all(deployment: Deployment): Promise<TradingFeePpmUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('tradingFeePpmUpdatedEvents')
      .leftJoinAndSelect('tradingFeePpmUpdatedEvents.block', 'block')
      .leftJoinAndSelect('tradingFeePpmUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('pair.token0', 'token0')
      .leftJoinAndSelect('pair.token1', 'token1')
      .where('tradingFeePpmUpdatedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('tradingFeePpmUpdatedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async update(endBlock: number, deployment: Deployment): Promise<any> {
    const res = await this.harvesterService.processEvents({
      entity: 'trading-fee-ppm-updated-events',
      contractName: ContractsNames.CarbonController,
      eventName: 'TradingFeePPMUpdated',
      endBlock,
      repository: this.repository,
      bigNumberFields: ['prevFeePPM', 'newFeePPM'],
      tagTimestampFromBlock: true,
      deployment: deployment, // Pass deployment
    });
    this.logger.log(
      `[update] Completed trading-fee-ppm-updated-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
    return res;
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<TradingFeePpmUpdatedEvent[]> {
    return this.repository
      .createQueryBuilder('tradingFeePpmUpdatedEvents')
      .leftJoinAndSelect('tradingFeePpmUpdatedEvents.block', 'block')
      .leftJoinAndSelect('tradingFeePpmUpdatedEvents.pair', 'pair')
      .leftJoinAndSelect('pair.token0', 'token0')
      .leftJoinAndSelect('pair.token1', 'token1')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('tradingFeePpmUpdatedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('tradingFeePpmUpdatedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async last(deployment: Deployment): Promise<TradingFeePpmUpdatedEvent> {
    return this.repository.findOne({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
      order: {
        timestamp: 'DESC',
      },
    });
  }
}
