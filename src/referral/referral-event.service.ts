import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs, ProcessEventsArgs } from '../harvester/harvester.service';
import { Deployment } from '../deployment/deployment.service';
import { ReferralCode } from './entities/referral-code.entity';
import { GovSetCodeOwnerEvent } from './entities/depreciated_events/gov-set-code-owner.entity';
import { SetCodeOwnerEvent } from './entities/depreciated_events/set-code-owner.entity';
import { SetHandlerEvent } from './entities/depreciated_events/set-handler.entity';
import { SetReferrerDiscountShareEvent } from './entities/depreciated_events/set-referrer-discount-share.entity';
import { SetReferrerTierEvent } from './entities/depreciated_events/set-referrer-tier.entity';
import { SetTierEvent } from './entities/depreciated_events/set-tier.entity';
import { SetTraderReferralCodeEvent } from './entities/depreciated_events/set-trader-referral-code.entity';

interface ReferralEvent {
  chainId?: number;
  blockNumber?: number;
  transactionHash?: string;
  code?: string;
  codeDecoded?: string;
  owner?: string;
  tierId?: string;
  totalRebate?: string;
  discountShare?: string;
}

/**
 * Service for processing referral events using the harvester pattern
 */
@Injectable()
export class ReferralEventService {
  private readonly logger = new Logger(ReferralEventService.name);

  constructor(
    @Inject(forwardRef(() => HarvesterService))
    private harvesterService: HarvesterService,
    @InjectRepository(ReferralCode)
    private referralCodesRepository: Repository<ReferralCode>,
    @InjectRepository(GovSetCodeOwnerEvent)
    private govSetCodeOwnerRepository: Repository<GovSetCodeOwnerEvent>,
    @InjectRepository(SetCodeOwnerEvent)
    private setCodeOwnerRepository: Repository<SetCodeOwnerEvent>,
    @InjectRepository(SetHandlerEvent)
    private setHandlerRepository: Repository<SetHandlerEvent>,
    @InjectRepository(SetReferrerDiscountShareEvent)
    private setReferrerDiscountShareRepository: Repository<SetReferrerDiscountShareEvent>,
    @InjectRepository(SetReferrerTierEvent)
    private setReferrerTierRepository: Repository<SetReferrerTierEvent>,
    @InjectRepository(SetTierEvent)
    private setTierRepository: Repository<SetTierEvent>,
    @InjectRepository(SetTraderReferralCodeEvent)
    private setTraderReferralCodeRepository: Repository<SetTraderReferralCodeEvent>,
  ) {
    this.decodeReferralCode = this.decodeReferralCode.bind(this);
    this.validateSetTierEvent = this.validateSetTierEvent.bind(this);
    this.validateReferralCode = this.validateReferralCode.bind(this);
  }

  /**
   * Update all referral events up to the specified block
   */
  async update(endBlock: number, deployment: Deployment): Promise<void> {
    if (!deployment.contracts[ContractsNames.ReferralStorage]) {
      return;
    }

    const chainId = this.getChainIdForBlockchain(deployment.blockchainType);
    const customData = { chainId };

    try {
      // Process all event types in parallel
      await Promise.all([
        // RegisterCode events
        this.harvesterService.processEvents({
          entity: 'referral-codes',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'RegisterCode',
          endBlock,
          repository: this.referralCodesRepository,
          stringFields: ['account'],
          customFns: [this.decodeReferralCode, this.validateReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // GovSetCodeOwner events
        this.harvesterService.processEvents({
          entity: 'gov-set-code-owner-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'GovSetCodeOwner',
          endBlock,
          repository: this.govSetCodeOwnerRepository,
          stringFields: ['newAccount'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetCodeOwner events
        this.harvesterService.processEvents({
          entity: 'set-code-owner-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetCodeOwner',
          endBlock,
          repository: this.setCodeOwnerRepository,
          stringFields: ['account', 'newAccount'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetHandler events
        this.harvesterService.processEvents({
          entity: 'set-handler-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetHandler',
          endBlock,
          repository: this.setHandlerRepository,
          stringFields: ['handler'],
          booleanFields: ['isActive'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetReferrerDiscountShare events
        this.harvesterService.processEvents({
          entity: 'set-referrer-discount-share-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetReferrerDiscountShare',
          endBlock,
          repository: this.setReferrerDiscountShareRepository,
          stringFields: ['referrer'],
          bigNumberFields: ['discountShare'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetReferrerTier events
        this.harvesterService.processEvents({
          entity: 'set-referrer-tier-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetReferrerTier',
          endBlock,
          repository: this.setReferrerTierRepository,
          stringFields: ['referrer'],
          bigNumberFields: ['tierId'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetTier events
        this.harvesterService.processEvents({
          entity: 'set-tier-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetTier',
          endBlock,
          repository: this.setTierRepository,
          bigNumberFields: ['tierId', 'totalRebate', 'discountShare'],
          customFns: [this.decodeReferralCode, this.validateSetTierEvent],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),

        // SetTraderReferralCode events
        this.harvesterService.processEvents({
          entity: 'set-trader-referral-code-events',
          contractName: ContractsNames.ReferralStorage,
          eventName: 'SetTraderReferralCode',
          endBlock,
          repository: this.setTraderReferralCodeRepository,
          stringFields: ['account'],
          customFns: [this.decodeReferralCode],
          customData,
          tagTimestampFromBlock: true,
          deployment,
        } as ProcessEventsArgs),
      ]);
    } catch (error) {
      this.logger.error(`Error processing referral events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to get chain ID from blockchain type
   */
  private getChainIdForBlockchain(blockchainType: string): number {
    switch (blockchainType) {
      case 'berachain':
        return 80085; // Berachain testnet chain ID
      case 'ethereum':
        return 1;
      case 'arbitrum':
        return 42161;
      case 'optimism':
        return 10;
      case 'base':
        return 8453;
      default:
        this.logger.warn(`Unknown blockchain type: ${blockchainType}, defaulting to chain ID 1`);
        return 1;
    }
  }

  /**
   * Additional validation for ReferralCode events
   */
  private async validateReferralCode(args: CustomFnArgs): Promise<ReferralEvent> {
    const { event, customData } = args;
    const eventAny = event as ReferralEvent;
    
    if (!eventAny.chainId && customData?.chainId) {
      eventAny.chainId = customData.chainId;
    }
    
    return eventAny;
  }

  /**
   * Additional validation for SetTier events
   */
  private async validateSetTierEvent(args: CustomFnArgs): Promise<ReferralEvent> {
    const { event, rawEvent } = args;
    const eventAny = event as ReferralEvent;
    
    if (!eventAny.blockNumber) {
      eventAny.blockNumber = parseInt(rawEvent.blockNumber);
    }
    
    if (!eventAny.transactionHash) {
      eventAny.transactionHash = rawEvent.transactionHash;
    }
    
    if (rawEvent.returnValues) {
      if (rawEvent.returnValues['_tierId'] !== undefined) {
        eventAny.tierId = rawEvent.returnValues['_tierId'].toString();
      }
      
      if (rawEvent.returnValues['_totalRebate'] !== undefined) {
        eventAny.totalRebate = rawEvent.returnValues['_totalRebate'].toString();
      }
      
      if (rawEvent.returnValues['_discountShare'] !== undefined) {
        eventAny.discountShare = rawEvent.returnValues['_discountShare'].toString();
      }
    }
    
    return eventAny;
  }

  /**
   * Decode bytes32 to string
   */
  private bytesToString(bytes: string): string {
    try {
      // Remove '0x' prefix if present
      const cleanBytes = bytes.startsWith('0x') ? bytes.slice(2) : bytes;
      
      // Convert hex to string and trim null bytes
      const decoded = Buffer.from(cleanBytes, 'hex')
        .toString('utf8')
        .replace(/\0/g, '');
      
      return decoded.trim();
    } catch (error) {
      this.logger.error(`Error decoding bytes to string: ${error.message}`);
      return bytes; // Return original bytes if decoding fails
    }
  }

  /**
   * Decode referral code from raw event
   */
  private async decodeReferralCode(args: CustomFnArgs): Promise<ReferralEvent> {
    const { event, rawEvent, customData } = args;
    const eventAny = event as ReferralEvent;
    
    // Set required fields from raw event
    if (rawEvent.blockNumber) {
      eventAny.blockNumber = parseInt(rawEvent.blockNumber);
    }
    
    if (rawEvent.transactionHash) {
      eventAny.transactionHash = rawEvent.transactionHash;
    }
    
    // Set chainId from customData
    if (customData?.chainId) {
      eventAny.chainId = customData.chainId;
    }
    
    // Get and decode the code
    const code = rawEvent.returnValues['code'];
    if (code) {
      eventAny.codeDecoded = this.bytesToString(code);
      eventAny.code = code;
    }
    
    // For RegisterCode events, map account to owner
    if (rawEvent.event === 'RegisterCode' && rawEvent.returnValues['account']) {
      eventAny.owner = rawEvent.returnValues['account'];
    }
    
    return eventAny;
  }
} 