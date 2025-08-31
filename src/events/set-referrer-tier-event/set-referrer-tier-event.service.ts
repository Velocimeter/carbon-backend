import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetReferrerTierEvent } from './set-referrer-tier-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetReferrerTierEventService {
  private readonly logger = new Logger(SetReferrerTierEventService.name);
  constructor(
    @InjectRepository(SetReferrerTierEvent)
    private repository: Repository<SetReferrerTierEvent>,
    private harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    if (!deployment.contracts[ContractsNames.ReferralStorage]) {
      return;
    }

    const chainId = NETWORK_IDS[deployment.blockchainType];
    if (!chainId) {
      return;
    }

    this.logger.log(
      `[update] Start set-referrer-tier-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
    await this.harvesterService.processEvents({
      entity: 'set-referrer-tier-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetReferrerTier',
      endBlock,
      repository: this.repository,
      stringFields: ['referrer', 'tierId'],
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
      deployment,
    });
    this.logger.log(
      `[update] Completed set-referrer-tier-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetReferrerTierEvent[]> {
    return this.repository
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
