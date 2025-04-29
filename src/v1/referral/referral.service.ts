import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralState } from '../../referral/referral-state.entity';

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
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralState)
    private referralStateRepository: Repository<ReferralState>,
  ) {}

  async getReferralRelationships(chainId?: number): Promise<ReferralOwnerEntry[]> {
    this.logger.log(`Getting referral relationships${chainId ? ` for chainId: ${chainId}` : ''}`);

    // First, get all relationships from the states
    const query = this.referralStateRepository.createQueryBuilder('state')
      .select('state.codeDecoded', 'codeDecoded')
      .addSelect('LOWER(state.owner)', 'owner')
      .addSelect('state.trader', 'trader')
      .orderBy('state.timestamp', 'DESC');

    if (chainId) {
      query.where('state.chainId = :chainId', { chainId });
    }

    // Execute query for relationships
    const relationships = await query.getRawMany();
    this.logger.log(`Found ${relationships.length} trader relationships`);
    this.logger.debug('First few relationships:', relationships.slice(0, 3));

    // Get all referral codes, including those without relationships
    const codesQuery = this.referralStateRepository.createQueryBuilder('state')
      .select('state.codeDecoded', 'codeDecoded')
      .addSelect('LOWER(state.owner)', 'owner')
      .distinctOn(['state.codeDecoded']);

    if (chainId) {
      codesQuery.where('state.chainId = :chainId', { chainId });
    }

    const allCodes = await codesQuery.getRawMany();
    this.logger.log(`Found ${allCodes.length} total referral codes`);
    this.logger.debug('First few codes:', allCodes.slice(0, 3));

    // Get tier information for all referrers
    const tiersMap = await this.getTierInformationForAffiliates(chainId);
    this.logger.log(`Found tier information for ${tiersMap.size} referrers`);

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
      
      if (!ownerMap.has(owner)) {
        const tierInfo = this.getTierDetailsForOwner(owner, tiersMap);
        ownerMap.set(owner, {
          codes: new Map(),
          tierInfo
        });
      }
      
      if (!ownerMap.get(owner).codes.has(rel.codeDecoded)) {
        ownerMap.get(owner).codes.set(rel.codeDecoded, {
          code: rel.codeDecoded,
          traders: new Set<string>()
        });
      }
      
      if (rel.trader) {
        ownerMap.get(owner).codes.get(rel.codeDecoded).traders.add(rel.trader);
      }
    }

    this.logger.log(`Processed data for ${ownerMap.size} unique owners`);

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

    this.logger.log(`Returning ${result.length} owner entries with their codes and traders`);
    this.logger.debug('Sample of final structure:', result.slice(0, 1));

    return result;
  }

  // Helper method to get tier information for all affiliates
  private async getTierInformationForAffiliates(chainId?: number): Promise<Map<string, any>> {
    // Get the latest tier assignment for each referrer
    const referrerTiersQuery = this.referralStateRepository.createQueryBuilder('state')
      .select('LOWER(state.owner)', 'owner')
      .addSelect('state.tierId', 'tierId')
      .addSelect('state.timestamp', 'timestamp')
      .orderBy('state.timestamp', 'DESC');
    
    if (chainId) {
      referrerTiersQuery.where('state.chainId = :chainId', { chainId });
    }
    
    const referrerTiers = await referrerTiersQuery.getRawMany();
    
    // Get all tier details
    const tierDetailsQuery = this.referralStateRepository.createQueryBuilder('state')
      .select('state.tierId', 'tierId')
      .addSelect('state.totalRebate', 'totalRebate')
      .addSelect('state.discountShare', 'discountShare')
      .orderBy('state.timestamp', 'DESC');
    
    if (chainId) {
      tierDetailsQuery.where('state.chainId = :chainId', { chainId });
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

  async getTraderCode(address: string, chainId?: number): Promise<{ 
    code: string | null, 
    owner?: string,
    tier?: { 
      tierId: string, 
      totalRebate: string, 
      discountShare: string 
    } 
  }> {
    this.logger.log(`Getting trader code, owner and tier info for address: ${address}${chainId ? ` and chainId: ${chainId}` : ''}`);
    
    const query = this.referralStateRepository.createQueryBuilder('state')
      .select('state.codeDecoded', 'code')
      .addSelect('LOWER(state.owner)', 'owner')
      .addSelect('state.tierId', 'tierId')
      .addSelect('state.totalRebate', 'totalRebate')
      .addSelect('state.discountShare', 'discountShare')
      .where('LOWER(state.trader) = LOWER(:address)', { address })
      .orderBy('state.timestamp', 'DESC');

    if (chainId) {
      query.andWhere('state.chainId = :chainId', { chainId });
    }

    const latestState = await query.getRawOne();

    if (!latestState) {
      this.logger.log(`No referral code found for trader: ${address}`);
      return { code: null };
    }

    this.logger.log(`Found referral code, owner and tier info for trader: ${address}`);
    return {
      code: latestState.code,
      owner: latestState.owner,
      tier: {
        tierId: latestState.tierId,
        totalRebate: latestState.totalRebate,
        discountShare: latestState.discountShare
      }
    };
  }
}
