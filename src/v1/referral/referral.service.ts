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
  traders: string[];
}

export interface ReferralOwnerEntry {
  owner: string;
  tierId: string;
  totalRebate: string;
  discountShare: string;
  codes: ReferralCodeEntry[];
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

  async getReferralRelationships(chainId?: number): Promise<ReferralOwnerEntry[]> {
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

    // Create a map to group by owner
    const ownerMap = new Map<string, {
      codes: Map<string, {
        code: string;
        traders: Set<string>;
      }>;
      tierInfo: any;
    }>();

    // First, process all codes, even those without traders
    for (const code of allCodes) {
      const owner = code.owner.toLowerCase();
      const tierInfo = this.getTierDetailsForOwner(owner, tiersMap);
      
      if (!ownerMap.has(owner)) {
        ownerMap.set(owner, {
          codes: new Map(),
          tierInfo
        });
      }
      
      ownerMap.get(owner).codes.set(code.codeDecoded, {
        code: code.codeDecoded,
        traders: new Set<string>()
      });
    }

    // Then, add all trader relationships
    for (const rel of relationships) {
      const owner = rel.owner.toLowerCase();
      
      // If the owner wasn't added from allCodes, add them now
      if (!ownerMap.has(owner)) {
        const tierInfo = this.getTierDetailsForOwner(owner, tiersMap);
        ownerMap.set(owner, {
          codes: new Map(),
          tierInfo
        });
      }
      
      // If this code wasn't added for this owner, add it now
      if (!ownerMap.get(owner).codes.has(rel.codeDecoded)) {
        ownerMap.get(owner).codes.set(rel.codeDecoded, {
          code: rel.codeDecoded,
          traders: new Set<string>()
        });
      }
      
      // Add the trader to this owner's code entry
      if (rel.trader) {
        ownerMap.get(owner).codes.get(rel.codeDecoded).traders.add(rel.trader);
      }
    }

    // Convert the map to the final array structure
    const result: ReferralOwnerEntry[] = [];
    for (const [owner, data] of ownerMap.entries()) {
      const codes: ReferralCodeEntry[] = [];
      for (const [code, codeData] of data.codes.entries()) {
        codes.push({
          code,
          traders: Array.from(codeData.traders)
        });
      }
      
      result.push({
        owner,
        codes,
        ...data.tierInfo
      });
    }

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
