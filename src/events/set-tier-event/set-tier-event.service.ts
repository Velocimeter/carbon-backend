import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class SetTierEventService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-set-tier',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTier',
      endBlock,
      repository: this.referralCodeRepository,
      stringFields: ['tierId', 'totalRebate', 'discountShare'],
      bigNumberFields: [],
      deployment,
    });
  }
} 