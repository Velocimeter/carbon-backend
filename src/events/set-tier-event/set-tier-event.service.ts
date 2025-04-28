import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetTierEvent } from './set-tier-event.entity';

@Injectable()
export class SetTierEventService {
  constructor(
    @InjectRepository(SetTierEvent)
    private readonly setTierEventRepository: Repository<SetTierEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-set-tier',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTier',
      endBlock,
      repository: this.setTierEventRepository,
      stringFields: ['tierId', 'totalRebate', 'discountShare'],
      bigNumberFields: [],
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetTierEvent[]> {
    return this.setTierEventRepository
      .createQueryBuilder('setTierEvents')
      .leftJoinAndSelect('setTierEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('setTierEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('setTierEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }
} 