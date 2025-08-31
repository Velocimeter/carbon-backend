import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { ArbitrageExecutedEventV2 } from './arbitrage-executed-event-v2.entity';
import { ContractsNames, HarvesterService } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class ArbitrageExecutedEventServiceV2 {
  private readonly logger = new Logger(ArbitrageExecutedEventServiceV2.name);
  constructor(
    @InjectRepository(ArbitrageExecutedEventV2)
    private repository: Repository<ArbitrageExecutedEventV2>,
    private harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<any> {
    if (!deployment.contracts[ContractsNames.BancorArbitrageV2]) {
      return;
    }

    this.logger.log(
      `[update] Start arbitrage-executed-events-v2 for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    try {
      const res = await this.harvesterService.processEvents({
        entity: 'arbitrage-executed-events-v2',
        contractName: ContractsNames.BancorArbitrageV2,
        eventName: 'ArbitrageExecuted',
        endBlock,
        repository: this.repository,
        stringFields: [
          'caller',
          'exchanges',
          'tokenPath',
          'sourceTokens',
          'sourceAmounts',
          'protocolAmounts',
          'rewardAmounts',
        ],
        tagTimestampFromBlock: true,
        deployment,
        contractAddress: deployment.contracts[ContractsNames.BancorArbitrageV2].address,
      });
      this.logger.log(
        `[update] Completed arbitrage-executed-events-v2 for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
      );
      return res;
    } catch (err) {
      const driverCode = (err as any)?.driverError?.code || (err as any)?.code;
      const msg = ((err && ((err as any).message || String(err))) as string) || '';
      const isMissingTable =
        driverCode === '42P01' || // postgres undefined_table
        msg.includes('does not exist') ||
        (msg.includes('relation') && msg.includes('arbitrage-executed-events-v2'));

      if (isMissingTable) {
        this.logger.warn(
          `[update] Skipping arbitrage-executed-events-v2 for ${deployment.blockchainType}:${deployment.exchangeId}: table missing`,
        );
        return;
      }
      this.logger.error(
        `[update] Error in arbitrage-executed-events-v2 for ${deployment.blockchainType}:${deployment.exchangeId}: ${msg}`,
      );
      throw err;
    }
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<ArbitrageExecutedEventV2[]> {
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

  async all(deployment: Deployment): Promise<ArbitrageExecutedEventV2[]> {
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
