import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class SetTraderReferralCodeEventService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-set-trader-referral-code',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTraderReferralCode',
      endBlock,
      repository: this.referralCodeRepository,
      stringFields: ['trader', 'code'],
      bigNumberFields: [],
      deployment,
    });
  }
} 