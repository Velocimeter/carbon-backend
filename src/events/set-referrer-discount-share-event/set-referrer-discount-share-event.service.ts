import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetReferrerDiscountShareEvent } from './set-referrer-discount-share-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetReferrerDiscountShareEventService {
  constructor(
    @InjectRepository(SetReferrerDiscountShareEvent)
    private repository: Repository<SetReferrerDiscountShareEvent>,
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
      entity: 'set-referrer-discount-share-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetReferrerDiscountShare',
      endBlock,
      repository: this.repository,
      stringFields: ['referrer', 'discountShare'],
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetReferrerDiscountShareEvent[]> {
    return this.repository
      .createQueryBuilder('setReferrerDiscountShareEvents')
      .leftJoinAndSelect('setReferrerDiscountShareEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('setReferrerDiscountShareEvents.blockchainType = :blockchainType', {
        blockchainType: deployment.blockchainType,
      })
      .andWhere('setReferrerDiscountShareEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }
}
