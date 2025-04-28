import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetTraderReferralCodeEvent } from './set-trader-referral-code-event.entity';

@Injectable()
export class SetTraderReferralCodeEventService {
  constructor(
    @InjectRepository(SetTraderReferralCodeEvent)
    private readonly setTraderReferralCodeEventRepository: Repository<SetTraderReferralCodeEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-set-trader-referral-code',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTraderReferralCode',
      endBlock,
      repository: this.setTraderReferralCodeEventRepository,
      stringFields: ['code', 'trader'],
      bigNumberFields: [],
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetTraderReferralCodeEvent[]> {
    return this.setTraderReferralCodeEventRepository
      .createQueryBuilder('setTraderReferralCodeEvents')
      .leftJoinAndSelect('setTraderReferralCodeEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('setTraderReferralCodeEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('setTraderReferralCodeEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }
} 