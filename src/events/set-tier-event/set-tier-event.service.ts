import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetTierEvent } from './set-tier-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetTierEventService {
  constructor(
    @InjectRepository(SetTierEvent)
    private repository: Repository<SetTierEvent>,
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

    await this.harvesterService.processEvents({
      entity: 'set-tier-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTier',
      endBlock,
      repository: this.repository,
      stringFields: ['tierId', 'totalRebate', 'discountShare'],
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetTierEvent[]> {
    return this.repository
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
