import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { Deployment } from '../../deployment/deployment.service';

@Injectable()
export class RegisterCodeEventService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-register-code',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'RegisterCode',
      endBlock,
      repository: this.referralCodeRepository,
      stringFields: ['code', 'referrer'],
      bigNumberFields: [],
      deployment,
    });
  }
} 