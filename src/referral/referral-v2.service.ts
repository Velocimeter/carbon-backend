import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralState } from './entities/referral-state.entity';
import { BlockchainType, Deployment } from '../deployment/deployment.service';
import { RegisterCodeEventService } from '../events/register-code-event/register-code-event.service';
import { GovSetCodeOwnerEventService } from '../events/gov-set-code-owner-event/gov-set-code-owner-event.service';
import { SetCodeOwnerEventService } from '../events/set-code-owner-event/set-code-owner-event.service';
import { SetHandlerEventService } from '../events/set-handler-event/set-handler-event.service';
import { SetReferrerDiscountShareEventService } from '../events/set-referrer-discount-share-event/set-referrer-discount-share-event.service';
import { SetReferrerTierEventService } from '../events/set-referrer-tier-event/set-referrer-tier-event.service';
import { SetTierEventService } from '../events/set-tier-event/set-tier-event.service';
import { SetTraderReferralCodeEventService } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.service';

// Default tier values
const DEFAULT_TIER = {
  tierId: "0",
  totalRebate: "0",
  discountShare: "0"
};

// Track code ownership and tier info
interface CodeState {
  code: string;
  owner: string;
  tierId: string;
  totalRebate: string;
  discountShare: string;
  lastProcessedBlock: number;
}

@Injectable()
export class ReferralV2Service {
  private readonly logger = new Logger(ReferralV2Service.name);
  private readonly BATCH_SIZE = 300000; // Number of blocks per batch
  private readonly SAVE_BATCH_SIZE = 1000; // Number of referrals to save at once

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
    @InjectRepository(ReferralState)
    private readonly referralStateRepository: Repository<ReferralState>,
    private readonly lastProcessedBlockService: LastProcessedBlockService,
    private readonly registerCodeEventService: RegisterCodeEventService,
    private readonly govSetCodeOwnerEventService: GovSetCodeOwnerEventService,
    private readonly setCodeOwnerEventService: SetCodeOwnerEventService,
    private readonly setHandlerEventService: SetHandlerEventService,
    private readonly setReferrerDiscountShareEventService: SetReferrerDiscountShareEventService,
    private readonly setReferrerTierEventService: SetReferrerTierEventService,
    private readonly setTierEventService: SetTierEventService,
    private readonly setTraderReferralCodeEventService: SetTraderReferralCodeEventService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    const key = `${deployment.blockchainType}-${deployment.exchangeId}-referrals-v2`;
    const lastProcessedBlock = await this.lastProcessedBlockService.getOrInit(key, deployment.startBlock);
    
    // Clean up existing states for this batch range
    await this.referralStateRepository
      .createQueryBuilder()
      .delete()
      .where('"lastProcessedBlock" >= :lastProcessedBlock', { lastProcessedBlock })
      .andWhere('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('"exchangeId" = :exchangeId', { exchangeId: deployment.exchangeId })
      .execute();

    // Initialize state map of codes and their current tier info
    const codeStates = new Map<string, CodeState>();
    await this.initializeCodeStates(lastProcessedBlock, deployment, codeStates);

    // Process blocks in batches
    for (let batchStart = lastProcessedBlock; batchStart < endBlock; batchStart += this.BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + this.BATCH_SIZE - 1, endBlock);

      // Fetch all relevant events in parallel
      const [
        registerCodeEvents,
        setTraderReferralCodeEvents,
        setReferrerTierEvents,
        setTierEvents,
      ] = await Promise.all([
        this.registerCodeEventService.get(batchStart, batchEnd, deployment),
        this.setTraderReferralCodeEventService.get(batchStart, batchEnd, deployment),
        this.setReferrerTierEventService.get(batchStart, batchEnd, deployment),
        this.setTierEventService.get(batchStart, batchEnd, deployment),
      ]);

      // Process events chronologically
      const allEvents = this.sortEventsByChronologicalOrder(
        registerCodeEvents,
        setTraderReferralCodeEvents,
        setReferrerTierEvents,
        setTierEvents
      );

      const states: ReferralState[] = [];
      
      // Process each event and update states
      for (const { type, event } of allEvents) {
        switch (type) {
          case 'register_code': {
            // When a code is registered, just track it in codeStates
            codeStates.set(event.code, {
              code: event.code,
              owner: event.referrer,
              tierId: DEFAULT_TIER.tierId,
              totalRebate: DEFAULT_TIER.totalRebate,
              discountShare: DEFAULT_TIER.discountShare,
              lastProcessedBlock: event.block.id
            });
            break;
          }
          case 'set_trader_code': {
            // When a trader sets a code, create/update their state row
            const codeState = codeStates.get(event.code);
            if (codeState) {
              const state = new ReferralState();
              state.blockchainType = deployment.blockchainType;
              state.exchangeId = deployment.exchangeId;
              state.trader = event.account;
              state.code = event.code;
              state.codeDecoded = event.codeDecoded;
              state.owner = codeState.owner;
              state.chainId = event.chainId;
              state.timestamp = event.timestamp;
              state.lastProcessedBlock = event.block.id;
              state.tierId = codeState.tierId;
              state.totalRebate = codeState.totalRebate;
              state.discountShare = codeState.discountShare;
              
              states.push(state);
            }
            break;
          }
          case 'set_referrer_tier': {
            // When a referrer's tier changes, update all codes they own
            for (const [code, state] of codeStates.entries()) {
              if (state.owner.toLowerCase() === event.referrer.toLowerCase()) {
                state.tierId = event.tierId;
                state.lastProcessedBlock = event.block.id;
                
                // Update all traders using this referrer's codes
                const updatedStates = states.filter(s => s.code === code);
                for (const traderState of updatedStates) {
                  traderState.tierId = event.tierId;
                  traderState.lastProcessedBlock = event.block.id;
                }
              }
            }
            break;
          }
          case 'set_tier': {
            // When tier details change, update all codes with that tier
            for (const [code, state] of codeStates.entries()) {
              if (state.tierId === event.tierId) {
                state.totalRebate = event.totalRebate;
                state.discountShare = event.discountShare;
                state.lastProcessedBlock = event.block.id;
                
                // Update all traders using codes with this tier
                const updatedStates = states.filter(s => s.code === code);
                for (const traderState of updatedStates) {
                  traderState.totalRebate = event.totalRebate;
                  traderState.discountShare = event.discountShare;
                  traderState.lastProcessedBlock = event.block.id;
                }
              }
            }
            break;
          }
        }
      }

      // Save states in batches
      for (let i = 0; i < states.length; i += this.SAVE_BATCH_SIZE) {
        const batch = states.slice(i, i + this.SAVE_BATCH_SIZE);
        await this.referralStateRepository.save(batch);
      }

      // Update last processed block
      await this.lastProcessedBlockService.update(key, batchEnd);
    }
  }

  private sortEventsByChronologicalOrder(registerCodeEvents: any[], setTraderReferralCodeEvents: any[], setReferrerTierEvents: any[], setTierEvents: any[]) {
    return [
      ...this.mapEventsWithType('register_code', registerCodeEvents),
      ...this.mapEventsWithType('set_trader_code', setTraderReferralCodeEvents),
      ...this.mapEventsWithType('set_referrer_tier', setReferrerTierEvents),
      ...this.mapEventsWithType('set_tier', setTierEvents),
    ].sort((a, b) => {
      if (a.event.block.id !== b.event.block.id) return a.event.block.id - b.event.block.id;
      if (a.event.transactionIndex !== b.event.transactionIndex) return a.event.transactionIndex - b.event.transactionIndex;
      return a.event.logIndex - b.event.logIndex;
    });
  }

  private mapEventsWithType(type: string, events: any[]) {
    return events.map(event => ({ type, event }));
  }

  private async initializeCodeStates(lastProcessedBlock: number, deployment: Deployment, codeStates: Map<string, CodeState>): Promise<void> {
    // Get the last state for each code
    const lastStates = await this.referralStateRepository
      .createQueryBuilder('state')
      .distinctOn(['state.code'])
      .where('state."lastProcessedBlock" <= :lastProcessedBlock', { lastProcessedBlock })
      .andWhere('state."blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .andWhere('state."exchangeId" = :exchangeId', { exchangeId: deployment.exchangeId })
      .orderBy('state.code')
      .addOrderBy('state."lastProcessedBlock"', 'DESC')
      .getMany();

    // Initialize the state map
    for (const state of lastStates) {
      codeStates.set(state.code, {
        code: state.code,
        owner: state.owner,
        tierId: state.tierId,
        totalRebate: state.totalRebate,
        discountShare: state.discountShare,
        lastProcessedBlock: state.lastProcessedBlock
      });
    }
  }

  async getTraderReferralInfo(trader: string, chainId?: number): Promise<ReferralState | null> {
    const queryBuilder = this.referralStateRepository.createQueryBuilder('state')
      .where('LOWER(state.trader) = LOWER(:trader)', { trader });
    
    if (chainId) {
      queryBuilder.andWhere('state.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getOne();
  }

  async getReferralsByCode(code: string, chainId?: number): Promise<ReferralState[]> {
    const queryBuilder = this.referralStateRepository.createQueryBuilder('state')
      .where('state.code = :code', { code });
    
    if (chainId) {
      queryBuilder.andWhere('state.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getMany();
  }

  async getReferralsByOwner(owner: string, chainId?: number): Promise<ReferralState[]> {
    const queryBuilder = this.referralStateRepository.createQueryBuilder('state')
      .where('LOWER(state.owner) = LOWER(:owner)', { owner });
    
    if (chainId) {
      queryBuilder.andWhere('state.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getMany();
  }

  async getTradersByOwner(owner: string, chainId?: number): Promise<{
    totalTraders: number,
    traders: {
      trader: string,
      code: string,
      codeDecoded: string,
      tierId: string,
      totalRebate: string,
      discountShare: string,
      timestamp: Date
    }[]
  }> {
    const queryBuilder = this.referralStateRepository.createQueryBuilder('state')
      .select([
        'state.trader',
        'state.code',
        'state.codeDecoded',
        'state.tierId',
        'state.totalRebate',
        'state.discountShare',
        'state.timestamp'
      ])
      .where('LOWER(state.owner) = LOWER(:owner)', { owner })
      .orderBy('state.timestamp', 'DESC');
    
    if (chainId) {
      queryBuilder.andWhere('state.chainId = :chainId', { chainId });
    }

    const traders = await queryBuilder.getMany();
    
    return {
      totalTraders: traders.length,
      traders: traders.map(t => ({
        trader: t.trader,
        code: t.code,
        codeDecoded: t.codeDecoded,
        tierId: t.tierId,
        totalRebate: t.totalRebate,
        discountShare: t.discountShare,
        timestamp: t.timestamp
      }))
    };
  }

  private getChainIdForBlockchain(blockchainType: BlockchainType): number {
    switch (blockchainType) {
      case BlockchainType.Ethereum:
        return 1;
      case BlockchainType.Base:
        return 8453;
      default:
        throw new Error(`Unsupported blockchain type: ${blockchainType}`);
    }
  }
} 