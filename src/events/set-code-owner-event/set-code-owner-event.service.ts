import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { SetCodeOwnerEvent } from './set-code-owner-event.entity';
import { Deployment } from '../../deployment/deployment.service';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetCodeOwnerEventService {
  private readonly logger = new Logger(SetCodeOwnerEventService.name);
  constructor(
    @InjectRepository(SetCodeOwnerEvent)
    private readonly setCodeOwnerEventRepository: Repository<SetCodeOwnerEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    const chainId = NETWORK_IDS[deployment.blockchainType];
    this.logger.log(
      `[update] Start set-code-owner-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    await this.harvesterService.processEvents({
      entity: 'set-code-owner',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetCodeOwner',
      endBlock,
      repository: this.setCodeOwnerEventRepository,
      stringFields: ['code', 'account', 'newAccount'],
      bigNumberFields: [],
      deployment,
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
    });
    this.logger.log(
      `[update] Completed set-code-owner-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
  }
}
