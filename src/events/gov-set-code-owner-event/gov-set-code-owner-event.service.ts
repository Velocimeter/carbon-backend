import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs } from '../../harvester/harvester.service';
import { Deployment } from '../../deployment/deployment.service';
import { GovSetCodeOwnerEvent } from '../../referral/entities/events/gov-set-code-owner.entity';

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

    const chainId = this.getChainIdForBlockchain(deployment.blockchainType);
    
    try {
      await this.harvesterService.processEvents({
        entity: 'gov-set-code-owner-events',
        contractName: ContractsNames.ReferralStorage,
        eventName: 'GovSetCodeOwner',
        endBlock,
        repository: this.govSetCodeOwnerRepository,
        stringFields: ['newAccount'],
        customFns: [this.decodeReferralCode],
        customData: { chainId },
        tagTimestampFromBlock: true,
        deployment,
      });
    } catch (error) {
      this.logger.error(`Error processing GovSetCodeOwner events: ${error.message}`);
      throw error;
    }
  }

  private getChainIdForBlockchain(blockchainType: string): number {
    switch (blockchainType) {
      case 'berachain':
        return 80085;
      case 'ethereum':
        return 1;
      case 'arbitrum':
        return 42161;
      case 'optimism':
        return 10;
      case 'base':
        return 8453;
      default:
        return 1;
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