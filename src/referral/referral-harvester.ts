import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { BlockchainType, Deployment } from '../deployment/deployment.service';
import { ReferralEventService } from './referral-event.service';
import { HarvesterService } from '../harvester/harvester.service';

/**
 * A helper service to bridge the harvester with the referral service
 */
@Injectable()
export class ReferralHarvester {
  constructor(
    private readonly referralEventService: ReferralEventService,
    @Inject(forwardRef(() => HarvesterService))
    private readonly harvesterService: HarvesterService
  ) {}

  /**
   * Called by the harvest service to trigger referral event harvesting
   */
  async harvestReferralEvents(deployment: Deployment): Promise<void> {
    try {
      // Use the modern harvester pattern for referral events
      const latestBlock = await this.harvesterService.latestBlock(deployment);
      await this.referralEventService.processAllReferralEvents(latestBlock, deployment);
      console.log(`Successfully harvested referral events for ${deployment.blockchainType} up to block ${latestBlock}`);
    } catch (error) {
      console.error(`Failed to harvest referral events for ${deployment.blockchainType}:`, error);
    }
  }
} 