import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { RegisterCodeEvent } from './register-code-event.entity';

@Injectable()
export class RegisterCodeEventService {
  constructor(
    @InjectRepository(RegisterCodeEvent)
    private readonly registerCodeEventRepository: Repository<RegisterCodeEvent>,
    private readonly harvesterService: HarvesterService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    await this.harvesterService.processEvents({
      entity: 'referral-register-code',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'RegisterCode',
      endBlock,
      repository: this.registerCodeEventRepository,
      stringFields: ['code', 'referrer'],
      bigNumberFields: [],
      deployment,
      customFns: [this.processEvent.bind(this)],
    });
  }

  async get(startBlock: number, endBlock: number, deployment: Deployment): Promise<RegisterCodeEvent[]> {
    return this.registerCodeEventRepository
      .createQueryBuilder('registerCodeEvents')
      .leftJoinAndSelect('registerCodeEvents.block', 'block')
      .where('block.id >= :startBlock', { startBlock })
      .andWhere('block.id <= :endBlock', { endBlock })
      .andWhere('registerCodeEvents.blockchainType = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('registerCodeEvents.exchangeId = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('block.id', 'ASC')
      .getMany();
  }

  private async processEvent(args: { event: any; rawEvent: any; customData: any }): Promise<any> {
    const { event, rawEvent, customData } = args;
    
    // Set block number and transaction hash
    if (rawEvent.blockNumber) {
      event.blockNumber = parseInt(rawEvent.blockNumber);
    }
    
    if (rawEvent.transactionHash) {
      event.transactionHash = rawEvent.transactionHash;
    }
    
    // Set chain ID from custom data
    if (customData?.chainId) {
      event.chainId = customData.chainId;
    }
    
    // Get and decode the code
    const code = rawEvent.returnValues['code'];
    if (code) {
      event.codeDecoded = this.bytesToString(code);
      event.code = code;
    }
    
    // Map account to referrer for RegisterCode events
    if (rawEvent.returnValues['account']) {
      event.referrer = rawEvent.returnValues['account'];
    }
    
    return event;
  }

  private bytesToString(hex: string): string {
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
} 