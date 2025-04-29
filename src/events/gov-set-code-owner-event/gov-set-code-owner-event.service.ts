import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { GovSetCodeOwnerEvent } from './gov-set-code-owner-event.entity';
import { NETWORK_IDS } from '../../codex/codex.service';

@Injectable()
export class GovSetCodeOwnerEventService {
  private readonly logger = new Logger(GovSetCodeOwnerEventService.name);

  constructor(
    @Inject(forwardRef(() => HarvesterService))
    private harvesterService: HarvesterService,
    @InjectRepository(GovSetCodeOwnerEvent)
    private govSetCodeOwnerRepository: Repository<GovSetCodeOwnerEvent>,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    if (!deployment.contracts[ContractsNames.ReferralStorage]) {
      return;
    }

    const chainId = NETWORK_IDS[deployment.blockchainType];
    
    try {
      await this.harvesterService.processEvents({
        entity: 'gov-set-code-owner-events',
        contractName: ContractsNames.ReferralStorage,
        eventName: 'GovSetCodeOwner',
        endBlock,
        repository: this.govSetCodeOwnerRepository,
        stringFields: ['newAccount'],
        customFns: [this.decodeReferralCode],
        constants: [{ key: 'chainId', value: chainId }],
        tagTimestampFromBlock: true,
        deployment,
      });
    } catch (error) {
      this.logger.error(`Error processing GovSetCodeOwner events: ${error.message}`);
      throw error;
    }
  }

  private async decodeReferralCode(args: CustomFnArgs): Promise<any> {
    const { event, rawEvent, customData } = args;
    const eventAny = event as any;
    
    if (rawEvent.blockNumber) {
      eventAny.blockNumber = parseInt(rawEvent.blockNumber);
    }
    
    if (rawEvent.transactionHash) {
      eventAny.transactionHash = rawEvent.transactionHash;
    }
    
    if (customData?.chainId) {
      eventAny.chainId = customData.chainId;
    }
    
    const code = rawEvent.returnValues['code'];
    if (code) {
      eventAny.codeDecoded = this.bytesToString(code);
      eventAny.code = code;
    }
    
    return eventAny;
  }

  private bytesToString(bytes: string): string {
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
} 