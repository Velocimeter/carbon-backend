import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { SetTraderReferralCodeEvent } from '../../referral/entities/events/set-trader-referral-code.entity';
import { SetReferrerTierEvent } from '../../referral/entities/events/set-referrer-tier.entity';
import { SetTierEvent } from '../../referral/entities/events/set-tier.entity';

// Define interface for the new structured response
export interface ReferralCodeEntry {
  code: string;
  owner: string;
  traders: string[];
  tierId: string;
  totalRebate: string;
  discountShare: string;
}

// Default tier values
const DEFAULT_TIER = {
  tierId: "0",
  totalRebate: "0",
  discountShare: "0"
};

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralCode)
    private referralCodesRepository: Repository<ReferralCode>,
    @InjectRepository(SetTraderReferralCodeEvent)
    private setTraderReferralCodeEventRepository: Repository<SetTraderReferralCodeEvent>,
    @InjectRepository(SetReferrerTierEvent)
    private setReferrerTierEventRepository: Repository<SetReferrerTierEvent>,
    @InjectRepository(SetTierEvent)
    private setTierEventRepository: Repository<SetTierEvent>,
  ) {}

  async getReferralRelationships(chainId?: number): Promise<ReferralCodeEntry[]> {
    // First, get all relationships from the events
    const query = this.setTraderReferralCodeEventRepository.createQueryBuilder('event')
      .select('event.account', 'trader')
      .addSelect('event.codeDecoded', 'codeDecoded')
      .addSelect('LOWER(referralCode.owner)', 'owner')
      .innerJoin(
        ReferralCode,
        'referralCode',
        'event.code = referralCode.code AND event.chainId = referralCode.chainId'
      )
      .orderBy('event.timestamp', 'DESC');

    // Apply chainId filter if provided
    if (chainId) {
      query.andWhere('event.chainId = :chainId', { chainId });
    }

    // Execute query for relationships
    const relationships = await query.getRawMany();

    // Get all referral codes, including those without relationships
    const codesQuery = this.referralCodesRepository.createQueryBuilder('code')
      .select('code.codeDecoded', 'codeDecoded')
      .addSelect('LOWER(code.owner)', 'owner');

    if (chainId) {
      codesQuery.where('code.chainId = :chainId', { chainId });
    }

    const allCodes = await codesQuery.getRawMany();

    // Get tier information for all referrers
    const tiersMap = await this.getTierInformationForAffiliates(chainId);

    // Create a map to group by code + owner
    const codeOwnerMap = new Map<string, {
      code: string;
      owner: string;
      traders: Set<string>;
      tierInfo: any;
    }>();

    // First, process all codes, even those without traders
    for (const code of allCodes) {
      const key = `${code.codeDecoded}:${code.owner}`;
      const tierInfo = this.getTierDetailsForOwner(code.owner, tiersMap);
      
      if (!codeOwnerMap.has(key)) {
        codeOwnerMap.set(key, {
          code: code.codeDecoded,
          owner: code.owner,
          traders: new Set<string>(),
          tierInfo
        });
      }
    }

    // Then, add all trader relationships
    for (const rel of relationships) {
      const key = `${rel.codeDecoded}:${rel.owner}`;
      
      // If the code+owner combination wasn't added from allCodes, add it now
      if (!codeOwnerMap.has(key)) {
        const tierInfo = this.getTierDetailsForOwner(rel.owner, tiersMap);
        codeOwnerMap.set(key, {
          code: rel.codeDecoded,
          owner: rel.owner,
          traders: new Set<string>(),
          tierInfo
        });
      }
      
      // Add the trader to this code+owner entry
      if (rel.trader) {
        codeOwnerMap.get(key).traders.add(rel.trader);
      }
    }

    // Convert the map to the final array structure
    const result: ReferralCodeEntry[] = Array.from(codeOwnerMap.values()).map(entry => ({
      code: entry.code,
      owner: entry.owner,
      traders: Array.from(entry.traders),
      ...entry.tierInfo
    }));

    return result;
  }

  // Helper method to get tier information for all affiliates
  private async getTierInformationForAffiliates(chainId?: number): Promise<Map<string, any>> {
    // Get the latest tier assignment for each referrer
    const referrerTiersQuery = this.setReferrerTierEventRepository.createQueryBuilder('referrerTier')
      .select('LOWER(referrerTier.referrer)', 'owner')
      .addSelect('referrerTier.tierId', 'tierId')
      .addSelect('referrerTier.timestamp', 'timestamp')
      .orderBy('referrerTier.timestamp', 'DESC');
    
    if (chainId) {
      referrerTiersQuery.where('referrerTier.chainId = :chainId', { chainId });
    }
    
    const referrerTiers = await referrerTiersQuery.getRawMany();
    
    // Get all tier details
    const tierDetailsQuery = this.setTierEventRepository.createQueryBuilder('tier')
      .select('tier.tierId', 'tierId')
      .addSelect('tier.totalRebate', 'totalRebate')
      .addSelect('tier.discountShare', 'discountShare')
      .orderBy('tier.timestamp', 'DESC');
    
    if (chainId) {
      tierDetailsQuery.where('tier.chainId = :chainId', { chainId });
    }
    
    const tierDetails = await tierDetailsQuery.getRawMany();
    
    // Create a map of tierId -> tier details
    const tierDetailsMap = new Map();
    for (const tier of tierDetails) {
      if (!tierDetailsMap.has(tier.tierId)) {
        tierDetailsMap.set(tier.tierId, {
          totalRebate: tier.totalRebate,
          discountShare: tier.discountShare
        });
      }
    }
    
    // Create a map of owner -> full tier information
    const ownerTierMap = new Map();
    const processedOwners = new Set();
    
    for (const referrerTier of referrerTiers) {
      const owner = referrerTier.owner;
      
      // Only process each owner once (getting their most recent tier)
      if (!processedOwners.has(owner)) {
        processedOwners.add(owner);
        
        const tierId = referrerTier.tierId;
        const tierDetail = tierDetailsMap.get(tierId);
        
        if (tierDetail) {
          ownerTierMap.set(owner, {
            tierId,
            totalRebate: tierDetail.totalRebate,
            discountShare: tierDetail.discountShare
          });
        } else {
          ownerTierMap.set(owner, { tierId });
        }
      }
    }
    
    return ownerTierMap;
  }
  
  // Helper method to get tier details for a specific owner
  private getTierDetailsForOwner(owner: string, tiersMap: Map<string, any>): any {
    const lowerOwner = owner.toLowerCase();
    if (tiersMap.has(lowerOwner)) {
      return tiersMap.get(lowerOwner);
    }
    return DEFAULT_TIER; // Return default tier values when no tier is assigned
  }
}
