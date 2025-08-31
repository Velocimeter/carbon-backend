import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { PairCreatedEvent } from './pair-created-event.entity';
import { ContractsNames, HarvesterService } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class PairCreatedEventService {
  private readonly logger = new Logger(PairCreatedEventService.name);
  constructor(
    @InjectRepository(PairCreatedEvent)
    private repository: Repository<PairCreatedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<any> {
    this.logger.log(
      `[update] Start pair-created-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    const result = await this.harvesterService.processEvents({
      entity: 'pair-created-events',
      contractName: ContractsNames.CarbonController,
      eventName: 'PairCreated',
      endBlock,
      repository: this.repository,
      stringFields: ['token0', 'token1'],
      tagTimestampFromBlock: true,
      deployment, // Pass deployment here
    });
    this.logger.log(
      `[update] Completed pair-created-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
    return result;
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<PairCreatedEvent[]> {
    return this.repository
      .createQueryBuilder('pairCreatedEvent')
      .leftJoinAndSelect('pairCreatedEvent.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('pairCreatedEvent.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('pairCreatedEvent.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }
}
