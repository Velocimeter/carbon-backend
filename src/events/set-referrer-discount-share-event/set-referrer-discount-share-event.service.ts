import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetReferrerDiscountShareEvent } from './set-referrer-discount-share-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetReferrerDiscountShareEventService {
  private readonly logger = new Logger(SetReferrerDiscountShareEventService.name);
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

    this.logger.log(
      `[update] Start set-referrer-discount-share-events for ${deployment.blockchainType}:${deployment.exchangeId}, endBlock=${endBlock}`,
    );
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
    this.logger.log(
      `[update] Completed set-referrer-discount-share-events for ${deployment.blockchainType}:${deployment.exchangeId} up to ${endBlock}`,
    );
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
