import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { SetTraderReferralCodeEvent } from './set-trader-referral-code-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class SetTraderReferralCodeEventService {
  constructor(
    @InjectRepository(SetTraderReferralCodeEvent)
    private repository: Repository<SetTraderReferralCodeEvent>,
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
      entity: 'set-trader-referral-code-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTraderReferralCode',
      endBlock,
      repository: this.repository,
      stringFields: ['account', 'code'],
      customFns: [this.parseEvent],
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<SetTraderReferralCodeEvent[]> {
    return this.repository
      .createQueryBuilder('setTraderReferralCodeEvents')
      .leftJoinAndSelect('setTraderReferralCodeEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('setTraderReferralCodeEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('setTraderReferralCodeEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async parseEvent(args: CustomFnArgs): Promise<SetTraderReferralCodeEvent> {
    const { event, rawEvent } = args;
    const typedEvent = event as SetTraderReferralCodeEvent;
    
    const code = rawEvent.returnValues['code'];
    if (code) {
      typedEvent.codeDecoded = bytesToString(code);
      typedEvent.code = code;
    }
    
    return typedEvent;
  }
}

function bytesToString(bytes: string): string {
  try {
    const cleanBytes = bytes.startsWith('0x') ? bytes.slice(2) : bytes;
    return Buffer.from(cleanBytes, 'hex')
      .toString('utf8')
      .replace(/\0/g, '')
      .trim();
  } catch (error) {
    return bytes;
  }
} 