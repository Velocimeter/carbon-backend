import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { VortexTokensTradedEvent } from './vortex-tokens-traded-event.entity';
import { ContractsNames, HarvesterService } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class VortexTokensTradedEventService {
  constructor(
    @InjectRepository(VortexTokensTradedEvent)
    private repository: Repository<VortexTokensTradedEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<any> {
    if (!deployment.contracts[ContractsNames.CarbonVortex]) {
      return;
    }

    return this.harvesterService.processEvents({
      entity: 'vortex-tokens-traded-events',
      contractName: ContractsNames.CarbonVortex,
      eventName: 'TokenTraded',
      endBlock,
      repository: this.repository,
      stringFields: ['caller', 'token'],
      bigNumberFields: ['sourceAmount', 'targetAmount'],
      tagTimestampFromBlock: true,
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<VortexTokensTradedEvent[]> {
    return this.repository
      .createQueryBuilder('vortexTokensTradedEvents')
      .leftJoinAndSelect('vortexTokensTradedEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('vortexTokensTradedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('vortexTokensTradedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async all(deployment: Deployment): Promise<VortexTokensTradedEvent[]> {
    return this.repository
      .createQueryBuilder('vortexTokensTradedEvents')
      .leftJoinAndSelect('vortexTokensTradedEvents.block', 'block')
      .leftJoinAndSelect('vortexTokensTradedEvents.token', 'token')
      .where('vortexTokensTradedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('vortexTokensTradedEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async getOne(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  async getTotalTradedAmounts(deployment: Deployment): Promise<{ 
    targetTokenAmount: string, 
    finalTokenAmount: string 
  }> {
    const TARGET_TOKEN = '0x6969696969696969696969696969696969696969';
    const FINAL_TOKEN = '0xfcbd14dc51f0a4d49d5e53c2e0950e0bc26d0dce';

    const result = await this.repository
      .createQueryBuilder('vortexTokensTradedEvents')
      .select([
        'SUM(CASE WHEN vortexTokensTradedEvents.token = :targetToken THEN vortexTokensTradedEvents.targetAmount ELSE 0 END) as targetTokenAmount',
        'SUM(CASE WHEN vortexTokensTradedEvents.token = :finalToken THEN vortexTokensTradedEvents.targetAmount ELSE 0 END) as finalTokenAmount'
      ])
      .where('vortexTokensTradedEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('vortexTokensTradedEvents.exchangeId = :exchangeId', { 
        exchangeId: deployment.exchangeId 
      })
      .andWhere('vortexTokensTradedEvents.token IN (:...tokens)', {
        tokens: [TARGET_TOKEN, FINAL_TOKEN]
      })
      .setParameter('targetToken', TARGET_TOKEN)
      .setParameter('finalToken', FINAL_TOKEN)
      .getRawOne();

    return {
      targetTokenAmount: result?.targetTokenAmount || '0',
      finalTokenAmount: result?.finalTokenAmount || '0'
    };
  }
}
