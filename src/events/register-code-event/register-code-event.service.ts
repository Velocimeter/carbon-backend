import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { RegisterCodeEvent } from './register-code-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class RegisterCodeEventService {
  constructor(
    @InjectRepository(RegisterCodeEvent)
    private repository: Repository<RegisterCodeEvent>,
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
      entity: 'register-code-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'RegisterCode',
      endBlock,
      repository: this.repository,
      stringFields: ['code', 'account'],
      customFns: [this.parseEvent],
      constants: [{ key: 'chainId', value: chainId }],
      tagTimestampFromBlock: true,
      deployment,
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<RegisterCodeEvent[]> {
    return this.repository
      .createQueryBuilder('registerCodeEvents')
      .leftJoinAndSelect('registerCodeEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('registerCodeEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('registerCodeEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  async parseEvent(args: CustomFnArgs): Promise<RegisterCodeEvent> {
    const { event, rawEvent } = args;
    const typedEvent = event as RegisterCodeEvent;

    // Get and decode the code
    const code = rawEvent.returnValues['code'];
    if (code) {
      typedEvent.codeDecoded = bytesToString(code);
      typedEvent.code = code;
    }

    // Map account field from event
    if (rawEvent.returnValues['account']) {
      typedEvent.account = rawEvent.returnValues['account'];
    }

    return typedEvent;
  }
}

function bytesToString(hex: string): string {
  try {
    // Remove '0x' prefix if present
    hex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Convert hex to bytes
    const bytes = Buffer.from(hex, 'hex');
    
    // Convert bytes to string and trim null bytes
    return bytes.toString('utf8').replace(/\0/g, '');
  } catch (error) {
    console.error('Error decoding hex string:', error);
    return '';
  }
} 