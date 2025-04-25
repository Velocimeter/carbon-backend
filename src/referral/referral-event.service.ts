import { Injectable, Inject, forwardRef, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HarvesterService, ContractsNames, CustomFnArgs } from '../harvester/harvester.service';
import { Deployment, DeploymentService } from '../deployment/deployment.service';
import { ReferralCode } from './entities/referral-code.entity';
import { GovSetCodeOwnerEvent } from './entities/events/gov-set-code-owner.entity';
import { SetCodeOwnerEvent } from './entities/events/set-code-owner.entity';
import { SetHandlerEvent } from './entities/events/set-handler.entity';
import { SetReferrerDiscountShareEvent } from './entities/events/set-referrer-discount-share.entity';
import { SetReferrerTierEvent } from './entities/events/set-referrer-tier.entity';
import { SetTierEvent } from './entities/events/set-tier.entity';
import { SetTraderReferralCodeEvent } from './entities/events/set-trader-referral-code.entity';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';

/**
 * Service for processing referral events using the harvester pattern
 */
@Injectable()
export class ReferralEventService implements OnModuleInit {
  private isProcessing = false;
  private readonly logger = new Logger(ReferralEventService.name);
  private readonly intervalDuration: number;
  private readonly shouldProcessReferrals: boolean;
  private readonly shouldStartFromStartBlock: boolean;
  private readonly referralsForceStartBlock: number;

  constructor(
    @Inject(forwardRef(() => HarvesterService))
    private harvesterService: HarvesterService,
    private deploymentService: DeploymentService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    private lastProcessedBlockService: LastProcessedBlockService,
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
    // Bind the decodeReferralCode method to the class instance
    this.decodeReferralCode = this.decodeReferralCode.bind(this);
    
    // Default to 5 minutes if not specified
    this.intervalDuration = +this.configService.get('PROCESS_REFERRALS_INTERVAL') || 300000;
    this.shouldProcessReferrals = this.configService.get('SHOULD_PROCESS_REFERRALS') === '1';
    this.shouldStartFromStartBlock = this.configService.get('SHOULD_START_REFERRALS_FROM_START_BLOCK') === '1';
    this.referralsForceStartBlock = +this.configService.get('REFERRALS_FORCE_START_BLOCK') || 0;
  }

  async onModuleInit() {
    if (this.shouldProcessReferrals) {
      this.logger.log(`Initializing referral processor with interval: ${this.intervalDuration}ms`);
      const callback = () => this.processReferrals();
      const interval = setInterval(callback, this.intervalDuration);
      this.schedulerRegistry.addInterval('processReferrals', interval);
      
      // Run immediately on startup if enabled
      if (this.configService.get('PROCESS_REFERRALS_ON_STARTUP') === '1') {
       
        this.processReferrals();
      }
    } else {
      this.logger.log('Referral processing is disabled. Set SHOULD_PROCESS_REFERRALS=1 to enable.');
    }
  }

  async processReferrals(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Referral processing is already in progress.');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting referral events processing');

    try {
      const deployments = this.deploymentService.getDeployments();
      
      // Process each deployment sequentially to avoid conflicts
      for (const deployment of deployments) {
        try {
          // Get the latest blockchain block
          const latestBlock = await this.harvesterService.latestBlock(deployment);
          
          // Process all referral events
          await this.processAllReferralEvents(latestBlock, deployment);
          
        } catch (error) {
          this.logger.error(`Failed to process referral events for ${deployment.blockchainType}: ${error.message}`);
          // Continue with other deployments even if one fails
        }
      }
      
      this.logger.log('Completed referral events processing');
    } catch (error) {
      this.logger.error(`Error processing referral events: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
  // Helper method to get the start block for a specific event type
  private async getStartBlock(eventType: string, deployment: Deployment): Promise<number> {
    const key = `${deployment.blockchainType}-${deployment.exchangeId}-${eventType}`;
    const lastProcessedBlock = await this.lastProcessedBlockService.getOrInit(key, deployment.startBlock);
    return lastProcessedBlock + 1;
  }

  /**
   * Process RegisterCode events
   */
  async processRegisterCodeEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('referral-codes', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'referral-codes',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'RegisterCode',
      endBlock,
      repository: this.referralCodesRepository,
      stringFields: ['account'],
      bigNumberFields: [],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process GovSetCodeOwner events
   */
  async processGovSetCodeOwnerEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('gov-set-code-owner-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'gov-set-code-owner-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'GovSetCodeOwner',
      endBlock,
      repository: this.govSetCodeOwnerRepository,
      stringFields: ['newAccount'],
      bigNumberFields: [],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetCodeOwner events
   */
  async processSetCodeOwnerEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-code-owner-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-code-owner-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetCodeOwner',
      endBlock,
      repository: this.setCodeOwnerRepository,
      stringFields: ['account', 'newAccount'],
      bigNumberFields: [],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetHandler events
   */
  async processSetHandlerEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-handler-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-handler-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetHandler',
      endBlock,
      repository: this.setHandlerRepository,
      stringFields: ['handler'],
      bigNumberFields: [],
      booleanFields: ['isActive'],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetReferrerDiscountShare events
   */
  async processSetReferrerDiscountShareEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-referrer-discount-share-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-referrer-discount-share-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetReferrerDiscountShare',
      endBlock,
      repository: this.setReferrerDiscountShareRepository,
      stringFields: ['referrer'],
      bigNumberFields: ['discountShare'],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetReferrerTier events
   */
  async processSetReferrerTierEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-referrer-tier-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-referrer-tier-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetReferrerTier',
      endBlock,
      repository: this.setReferrerTierRepository,
      stringFields: ['referrer'],
      bigNumberFields: ['tierId'],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetTier events
   */
  async processSetTierEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-tier-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-tier-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTier',
      endBlock,
      repository: this.setTierRepository,
      bigNumberFields: ['tierId', 'totalRebate', 'discountShare'],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process SetTraderReferralCode events
   */
  async processSetTraderReferralCodeEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    const startBlock = await this.getStartBlock('set-trader-referral-code-events', deployment);
    const result = await this.harvesterService.processEvents({
      entity: 'set-trader-referral-code-events',
      contractName: ContractsNames.ReferralStorage,
      eventName: 'SetTraderReferralCode',
      endBlock,
      repository: this.setTraderReferralCodeRepository,
      stringFields: ['account'],
      bigNumberFields: [],
      booleanFields: [],
      customFns: [this.decodeReferralCode],
      customData: { deployment },
      tagTimestampFromBlock: true,
      deployment,
      skipPreClearing: true,
      startAtBlock: startBlock,
    });
    return result;
  }

  /**
   * Process all referral events
   */
  async processAllReferralEvents(
    endBlock: number,
    deployment: Deployment,
  ): Promise<any> {
    return Promise.all([
      this.processRegisterCodeEvents(endBlock, deployment),
      this.processGovSetCodeOwnerEvents(endBlock, deployment),
      this.processSetCodeOwnerEvents(endBlock, deployment),
      this.processSetHandlerEvents(endBlock, deployment),
      this.processSetReferrerDiscountShareEvents(endBlock, deployment),
      this.processSetReferrerTierEvents(endBlock, deployment),
      this.processSetTierEvents(endBlock, deployment),
      this.processSetTraderReferralCodeEvents(endBlock, deployment),
    ]);
  }

  /**
   * Custom function to decode a referral code from bytes32 to a human-readable string
   */
  async decodeReferralCode(args: CustomFnArgs): Promise<any> {
    const { event, rawEvent, customData } = args;
    
    // Get chain info from the deployment
    const deployment = args.customData?.deployment;
    if (deployment) {
      // Set chain ID directly from the deployment
      event['chainId'] = parseInt(deployment.chainId);
    }
    
    // Handle code for events
    const code = rawEvent.returnValues['code'];
    
    // Make sure required fields are populated
    event['transactionHash'] = rawEvent.transactionHash;
    event['blockNumber'] = parseInt(rawEvent.blockNumber);
    
    // Account is used as owner for RegisterCode events
    if (rawEvent.event === 'RegisterCode' && rawEvent.returnValues['account']) {
      event['owner'] = rawEvent.returnValues['account'];
    }
    
    // Convert bytes32 code to string
    if (code) {
      event['codeDecoded'] = this.bytesToString(code);
      event['code'] = code;
    }
    
    return event;
  }

  /**
   * Convert a bytes32 hex string to a human-readable string
   * Extracted from the original ReferralChainService for consistency
   */
  private bytesToString(hexString: string): string {
    // Handle null or undefined input
    if (!hexString) {
      return '';
    }
    
    try {
      let result = '';
      // Remove '0x' prefix if present
      const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
      
      // Process bytes in pairs
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        // Stop at null terminator
        if (charCode === 0) break;
        // Only include printable ASCII characters
        if (charCode >= 32 && charCode <= 126) {
          result += String.fromCharCode(charCode);
        }
      }
      
      // Remove any non-alphanumeric characters
      return result.replace(/[^a-zA-Z0-9]/g, '');
    } catch (error) {
      return '';
    }
  }

  /**
   * Helper method to get chain ID for a specific blockchain type
   */
  private getChainIdForBlockchain(blockchainType: string): number {
    // Import the same NETWORK_IDS mapping from CodexService
    const NETWORK_IDS = {
      'sei-network': 531,
      'celo': 42220,
      'ethereum': 1,
      'fantom': 250,
      'mantle': 5000,
      'blast': 81457,
      'linea': 59144,
      'berachain': 80094,
      'base': 8453,
      'sonic': 122,
      'iota-evm': 42161,
    };
    
    return NETWORK_IDS[blockchainType] || 1;
  }
} 