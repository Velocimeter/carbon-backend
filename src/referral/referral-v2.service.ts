import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { ReferralState } from './referral-state.entity';
import { Deployment } from '../deployment/deployment.service';
import { RegisterCodeEventService } from '../events/register-code-event/register-code-event.service';
import { SetTraderReferralCodeEventService } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.service';
import { SetReferrerTierEventService } from '../events/set-referrer-tier-event/set-referrer-tier-event.service';
import { SetTierEventService } from '../events/set-tier-event/set-tier-event.service';
import { SetReferrerDiscountShareEventService } from '../events/set-referrer-discount-share-event/set-referrer-discount-share-event.service';

// Default tier values
const DEFAULT_TIER = {
  tierId: '0',
  totalRebate: '0',
  discountShare: '0',
};

// Track code ownership and tier info
interface CodeState {
  code: string;
  owner: string;
  tierId: string;
  totalRebate: string;
  discountShare: string;
  lastProcessedBlock: number;
  blockId: number;
}

@Injectable()
export class ReferralV2Service {
  private readonly logger = new Logger(ReferralV2Service.name);
  private readonly BATCH_SIZE = 30000; // Number of blocks per batch
  private readonly SAVE_BATCH_SIZE = 1000; // Number of referrals to save at once

  constructor(
    @InjectRepository(ReferralState)
    private readonly referralStateRepository: Repository<ReferralState>,
    private readonly lastProcessedBlockService: LastProcessedBlockService,
    private readonly registerCodeEventService: RegisterCodeEventService,
    private readonly setTraderReferralCodeEventService: SetTraderReferralCodeEventService,
    private readonly setReferrerTierEventService: SetReferrerTierEventService,
    private readonly setTierEventService: SetTierEventService,
    private readonly setReferrerDiscountShareEventService: SetReferrerDiscountShareEventService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    // First, process all events through their respective services up to endBlock
    await Promise.all([
      this.registerCodeEventService.update(endBlock, deployment),
      this.setTraderReferralCodeEventService.update(endBlock, deployment),
      this.setReferrerTierEventService.update(endBlock, deployment),
      this.setTierEventService.update(endBlock, deployment),
      this.setReferrerDiscountShareEventService.update(endBlock, deployment),
    ]);

    // Get the key for last processed block
    const key = `${deployment.blockchainType}-${deployment.exchangeId}-referral_states`;
    const lastProcessedBlock = await this.lastProcessedBlockService.getOrInit(key, deployment.startBlock);

    // Check if we have any existing states
    const existingStatesCount = await this.referralStateRepository.count({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
    });

    this.logger.log(`Last processed block: ${lastProcessedBlock}, existing states: ${existingStatesCount}`);

    // If no states exist, do a full rebuild from scratch
    if (existingStatesCount === 0) {
      this.logger.log('No existing states found, doing full rebuild');
      await this.rebuildAllStates(endBlock, deployment);
      return;
    }

    // Otherwise, just process new events since last run
    this.logger.log(`Processing new events from block ${lastProcessedBlock} to ${endBlock}`);

    // Get new events since last processed block
    const [
      registerCodeEvents, // Get all register events as we need them for lookups
      newTraderCodeEvents, // But only new trader code events
      setReferrerTierEvents, // Get all tier events as they affect all traders using that referrer's code
      setTierEvents, // Get all tier events as they affect all traders
    ] = await Promise.all([
      this.registerCodeEventService.get(0, endBlock, deployment),
      this.setTraderReferralCodeEventService.get(lastProcessedBlock + 1, endBlock, deployment),
      this.setReferrerTierEventService.get(0, endBlock, deployment),
      this.setTierEventService.get(0, endBlock, deployment),
    ]);

    this.logger.log(`Found new events:
      Register Code Events (all): ${registerCodeEvents.length}
      New Trader Code Events: ${newTraderCodeEvents.length}
      Referrer Tier Events (all): ${setReferrerTierEvents.length}
      Tier Events (all): ${setTierEvents.length}
    `);

    // Process new trader code events
    const latestStateByTrader = new Map<string, ReferralState>();

    for (const event of newTraderCodeEvents) {
      // Find who owns this code
      const registerEvent = registerCodeEvents
        .filter((e) => e.code === event.code)
        .sort((a, b) => b.block.id - a.block.id)[0];

      if (!registerEvent) {
        this.logger.warn(`No register event found for code ${event.code}`);
        continue;
      }

      // Find referrer's tier
      const referrerTierEvent = setReferrerTierEvents
        .filter((e) => e.referrer.toLowerCase() === registerEvent.account.toLowerCase())
        .sort((a, b) => b.block.id - a.block.id)[0];

      const tierId = referrerTierEvent?.tierId || DEFAULT_TIER.tierId;

      // Find tier details
      const tierEvent = setTierEvents.filter((e) => e.tierId === tierId).sort((a, b) => b.block.id - a.block.id)[0];

      // Create state
      const state = new ReferralState();
      state.blockchainType = deployment.blockchainType;
      state.exchangeId = deployment.exchangeId;
      state.trader = event.account;
      state.code = event.code;
      state.codeDecoded = event.codeDecoded;
      state.owner = registerEvent.account;
      state.chainId = event.chainId;
      state.timestamp = event.timestamp;
      state.lastProcessedBlock = event.block.id;
      state.blockId = event.block.id;
      state.tierId = tierId;
      state.totalRebate = tierEvent?.totalRebate || DEFAULT_TIER.totalRebate;
      state.discountShare = tierEvent?.discountShare || DEFAULT_TIER.discountShare;

      // Only keep the latest state for each trader
      const existingState = latestStateByTrader.get(state.trader.toLowerCase());
      if (!existingState || existingState.blockId < state.blockId) {
        latestStateByTrader.set(state.trader.toLowerCase(), state);
      }
    }

    // Also update states for any traders whose referrer's tier changed
    if (setReferrerTierEvents.length > 0 || setTierEvents.length > 0) {
      // Get all existing states that might need updating
      const existingStates = await this.referralStateRepository.find({
        where: {
          blockchainType: deployment.blockchainType,
          exchangeId: deployment.exchangeId,
        },
      });

      for (const state of existingStates) {
        // Find the register event for this code to get the owner
        const registerEvent = registerCodeEvents
          .filter((e) => e.code === state.code)
          .sort((a, b) => b.block.id - a.block.id)[0];

        if (!registerEvent) continue;

        // Check if the referrer's tier changed
        const referrerTierEvent = setReferrerTierEvents
          .filter((e) => e.referrer.toLowerCase() === registerEvent.account.toLowerCase())
          .sort((a, b) => b.block.id - a.block.id)[0];

        if (!referrerTierEvent && !setTierEvents.length) continue;

        const tierId = referrerTierEvent?.tierId || state.tierId;

        // Find tier details
        const tierEvent = setTierEvents.filter((e) => e.tierId === tierId).sort((a, b) => b.block.id - a.block.id)[0];

        if (!tierEvent) continue;

        // Update tier info if changed
        if (
          tierEvent.totalRebate !== state.totalRebate ||
          tierEvent.discountShare !== state.discountShare ||
          tierId !== state.tierId
        ) {
          state.tierId = tierId;
          state.totalRebate = tierEvent.totalRebate;
          state.discountShare = tierEvent.discountShare;
          state.lastProcessedBlock = Math.max(referrerTierEvent?.block?.id || 0, tierEvent.block.id);
          latestStateByTrader.set(state.trader.toLowerCase(), state);
        }
      }
    }

    const statesToUpdate = Array.from(latestStateByTrader.values());
    this.logger.log(`Updating ${statesToUpdate.length} states`);

    // Save states in batches using upsert
    for (let i = 0; i < statesToUpdate.length; i += this.SAVE_BATCH_SIZE) {
      const batch = statesToUpdate.slice(i, i + this.SAVE_BATCH_SIZE);
      try {
        await this.referralStateRepository
          .createQueryBuilder()
          .insert()
          .into(ReferralState)
          .values(batch)
          .orUpdate(
            [
              'code',
              'code_decoded',
              'owner',
              'tierId',
              'totalRebate',
              'discountShare',
              'last_processed_block',
              'block_id',
              'timestamp',
              'blockchainType',
              'exchangeId',
            ],
            ['trader', 'chain_id'],
          )
          .execute();

        this.logger.log(`Saved batch of ${batch.length} states`);
      } catch (error) {
        this.logger.error(`Failed to save batch: ${error.message}`);
        throw error;
      }
    }

    // Update last processed block
    await this.lastProcessedBlockService.update(key, endBlock);
  }

  private async rebuildAllStates(endBlock: number, deployment: Deployment): Promise<void> {
    // Get all historical events
    const [registerCodeEvents, setTraderReferralCodeEvents, setReferrerTierEvents, setTierEvents] = await Promise.all([
      this.registerCodeEventService.get(0, endBlock, deployment),
      this.setTraderReferralCodeEventService.get(0, endBlock, deployment),
      this.setReferrerTierEventService.get(0, endBlock, deployment),
      this.setTierEventService.get(0, endBlock, deployment),
    ]);

    this.logger.log(`Found events for rebuild:
      Register Code Events: ${registerCodeEvents.length}
      Trader Code Events: ${setTraderReferralCodeEvents.length}
      Referrer Tier Events: ${setReferrerTierEvents.length}
      Tier Events: ${setTierEvents.length}
    `);

    const latestStateByTrader = new Map<string, ReferralState>();

    for (const event of setTraderReferralCodeEvents) {
      // Find who owns this code
      const registerEvent = registerCodeEvents
        .filter((e) => e.code === event.code)
        .sort((a, b) => b.block.id - a.block.id)[0];

      if (!registerEvent) {
        this.logger.warn(`No register event found for code ${event.code}`);
        continue;
      }

      // Find referrer's tier
      const referrerTierEvent = setReferrerTierEvents
        .filter((e) => e.referrer.toLowerCase() === registerEvent.account.toLowerCase())
        .sort((a, b) => b.block.id - a.block.id)[0];

      const tierId = referrerTierEvent?.tierId || DEFAULT_TIER.tierId;

      // Find tier details
      const tierEvent = setTierEvents.filter((e) => e.tierId === tierId).sort((a, b) => b.block.id - a.block.id)[0];

      // Create state
      const state = new ReferralState();
      state.blockchainType = deployment.blockchainType;
      state.exchangeId = deployment.exchangeId;
      state.trader = event.account;
      state.code = event.code;
      state.codeDecoded = event.codeDecoded;
      state.owner = registerEvent.account;
      state.chainId = event.chainId;
      state.timestamp = event.timestamp;
      state.lastProcessedBlock = event.block.id;
      state.blockId = event.block.id;
      state.tierId = tierId;
      state.totalRebate = tierEvent?.totalRebate || DEFAULT_TIER.totalRebate;
      state.discountShare = tierEvent?.discountShare || DEFAULT_TIER.discountShare;

      // Only keep the latest state for each trader
      const existingState = latestStateByTrader.get(state.trader.toLowerCase());
      if (!existingState || existingState.blockId < state.blockId) {
        latestStateByTrader.set(state.trader.toLowerCase(), state);
      }
    }

    const states = Array.from(latestStateByTrader.values());
    this.logger.log(`Created ${states.length} states to save for rebuild`);

    // Save states in batches using upsert
    for (let i = 0; i < states.length; i += this.SAVE_BATCH_SIZE) {
      const batch = states.slice(i, i + this.SAVE_BATCH_SIZE);
      try {
        await this.referralStateRepository
          .createQueryBuilder()
          .insert()
          .into(ReferralState)
          .values(batch)
          .orUpdate(
            [
              'code',
              'code_decoded',
              'owner',
              'tierId',
              'totalRebate',
              'discountShare',
              'last_processed_block',
              'block_id',
              'timestamp',
              'blockchainType',
              'exchangeId',
            ],
            ['trader', 'chain_id'],
          )
          .execute();

        this.logger.log(`Saved batch of ${batch.length} states`);
      } catch (error) {
        this.logger.error(`Failed to save batch: ${error.message}`);
        throw error;
      }
    }

    // Update last processed block
    const key = `${deployment.blockchainType}-${deployment.exchangeId}-referral_states`;
    await this.lastProcessedBlockService.update(key, endBlock);
  }

  private sortEventsByChronologicalOrder(
    registerCodeEvents: any[],
    setTraderReferralCodeEvents: any[],
    setReferrerTierEvents: any[],
    setTierEvents: any[],
  ) {
    return [
      ...this.mapEventsWithType('register_code', registerCodeEvents),
      ...this.mapEventsWithType('set_trader_code', setTraderReferralCodeEvents),
      ...this.mapEventsWithType('set_referrer_tier', setReferrerTierEvents),
      ...this.mapEventsWithType('set_tier', setTierEvents),
    ].sort((a, b) => {
      if (a.event.block.id !== b.event.block.id) return a.event.block.id - b.event.block.id;
      if (a.event.transactionIndex !== b.event.transactionIndex)
        return a.event.transactionIndex - b.event.transactionIndex;
      return a.event.logIndex - b.event.logIndex;
    });
  }

  private mapEventsWithType(type: string, events: any[]) {
    return events.map((event) => ({ type, event }));
  }

  async getTraderReferralInfo(trader: string, chainId?: number): Promise<ReferralState | null> {
    const queryBuilder = this.referralStateRepository
      .createQueryBuilder('state')
      .where('LOWER(state.trader) = LOWER(:trader)', { trader });

    if (chainId) {
      queryBuilder.andWhere('state.chain_id = :chainId', { chainId });
    }

    return queryBuilder.getOne();
  }

  async getReferralsByCode(code: string, chainId?: number): Promise<ReferralState[]> {
    const queryBuilder = this.referralStateRepository.createQueryBuilder('state').where('state.code = :code', { code });

    if (chainId) {
      queryBuilder.andWhere('state.chain_id = :chainId', { chainId });
    }

    return queryBuilder.getMany();
  }

  async getReferralsByOwner(owner: string, chainId?: number): Promise<ReferralState[]> {
    const queryBuilder = this.referralStateRepository
      .createQueryBuilder('state')
      .where('LOWER(state.owner) = LOWER(:owner)', { owner });

    if (chainId) {
      queryBuilder.andWhere('state.chain_id = :chainId', { chainId });
    }

    return queryBuilder.getMany();
  }

  async getTradersByOwner(
    owner: string,
    chainId?: number,
  ): Promise<{
    totalTraders: number;
    traders: {
      trader: string;
      code: string;
      codeDecoded: string;
      tierId: string;
      totalRebate: string;
      discountShare: string;
      timestamp: Date;
    }[];
  }> {
    const queryBuilder = this.referralStateRepository
      .createQueryBuilder('state')
      .select([
        'state.trader',
        'state.code',
        'state.code_decoded',
        'state.tierId',
        'state.totalRebate',
        'state.discountShare',
        'state.timestamp',
      ])
      .where('LOWER(state.owner) = LOWER(:owner)', { owner })
      .orderBy('state.timestamp', 'DESC');

    if (chainId) {
      queryBuilder.andWhere('state.chain_id = :chainId', { chainId });
    }

    const traders = await queryBuilder.getMany();

    return {
      totalTraders: traders.length,
      traders: traders.map((t) => ({
        trader: t.trader,
        code: t.code,
        codeDecoded: t.codeDecoded,
        tierId: t.tierId,
        totalRebate: t.totalRebate,
        discountShare: t.discountShare,
        timestamp: t.timestamp,
      })),
    };
  }
}
