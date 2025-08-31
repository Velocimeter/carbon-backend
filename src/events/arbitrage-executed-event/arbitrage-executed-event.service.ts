import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { ArbitrageExecutedEvent } from './arbitrage-executed-event.entity';
import { ContractsNames, HarvesterService } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class ArbitrageExecutedEventService {
  private readonly logger = new Logger(ArbitrageExecutedEventService.name);
  constructor(
    @InjectRepository(ArbitrageExecutedEvent)
    private repository: Repository<ArbitrageExecutedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<any> {
    if (!deployment.contracts[ContractsNames.BancorArbitrage]) {
      return;
    }

    this.logger.log(
      `[update] Start arbitrage-executed-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    const res = await this.harvesterService.processEvents({
      entity: 'arbitrage-executed-events',
      contractName: ContractsNames.BancorArbitrage,
      eventName: 'ArbitrageExecuted',
      endBlock,
      repository: this.repository,
      stringFields: [
        'caller',
        'platformIds',
        'tokenPath',
        'sourceTokens',
        'sourceAmounts',
        'protocolAmounts',
        'rewardAmounts',
      ],
      tagTimestampFromBlock: true,
      deployment,
    });
    this.logger.log(
      `[update] Completed arbitrage-executed-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
    return res;
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<ArbitrageExecutedEvent[]> {
    return this.repository
      .createQueryBuilder('arbitrageExecutedEvents')
      .leftJoinAndSelect('arbitrageExecutedEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('arbitrageExecutedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('arbitrageExecutedEvents.exchangeId = :exchangeId', {
        exchangeId: deployment.exchangeId,
      })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async all(deployment: Deployment): Promise<ArbitrageExecutedEvent[]> {
    return this.repository
      .createQueryBuilder('arbitrageExecutedEvents')
      .leftJoinAndSelect('arbitrageExecutedEvents.block', 'block')
      .where('arbitrageExecutedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('arbitrageExecutedEvents.exchangeId = :exchangeId', {
        exchangeId: deployment.exchangeId,
      })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async getOne(id: number) {
    return this.repository.findOne({ where: { id } });
  }
}
