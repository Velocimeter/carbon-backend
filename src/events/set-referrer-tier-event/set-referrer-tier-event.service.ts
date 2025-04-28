import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetReferrerTierEvent } from './set-referrer-tier-event.entity';

@Injectable()
export class SetReferrerTierEventService {
  constructor(
    @InjectRepository(SetReferrerTierEvent)
    private readonly setReferrerTierEventRepository: Repository<SetReferrerTierEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-set-referrer-tier',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetReferrerTier',
      endBlock,
      repository: this.setReferrerTierEventRepository,
      stringFields: ['referrer', 'tierId'],
      bigNumberFields: [],
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetReferrerTierEvent[]> {
    return this.setReferrerTierEventRepository
      .createQueryBuilder('setReferrerTierEvents')
      .leftJoinAndSelect('setReferrerTierEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('setReferrerTierEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('setReferrerTierEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }
} 