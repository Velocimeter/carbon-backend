import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { SetHandlerEvent } from './set-handler-event.entity';
import { Deployment } from '../../deployment/deployment.service';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetHandlerEventService {
  constructor(
    @InjectRepository(SetHandlerEvent)
    private readonly setHandlerRepository: Repository<SetHandlerEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    const chainId = NETWORK_IDS[deployment.blockchainType];
    await this.harvesterService.processEvents({
      entity: 'set-handler-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetHandler',
      endBlock,
      repository: this.setHandlerRepository,
      stringFields: ['handler'],
      booleanFields: ['isActive'],
      deployment,
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
    });
  }
}
