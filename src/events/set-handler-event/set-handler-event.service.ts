import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { SetHandlerEvent } from './set-handler-event.entity';
import { Deployment } from '../../deployment/deployment.service';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetHandlerEventService {
  private readonly logger = new Logger(SetHandlerEventService.name);
  constructor(
    @InjectRepository(SetHandlerEvent)
    private readonly setHandlerRepository: Repository<SetHandlerEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    const chainId = NETWORK_IDS[deployment.blockchainType];
    this.logger.log(
      `[update] Start set-handler-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
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
    this.logger.log(
      `[update] Completed set-handler-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
  }
}
