import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { ReferralCode } from './entities/referral-code.entity';
import { BlockchainType, Deployment } from '../deployment/deployment.service';
import { RegisterCodeEventService } from '../events/register-code-event/register-code-event.service';
import { GovSetCodeOwnerEventService } from '../events/gov-set-code-owner-event/gov-set-code-owner-event.service';
import { SetCodeOwnerEventService } from '../events/set-code-owner-event/set-code-owner-event.service';
import { SetHandlerEventService } from '../events/set-handler-event/set-handler-event.service';
import { SetReferrerDiscountShareEventService } from '../events/set-referrer-discount-share-event/set-referrer-discount-share-event.service';
import { SetReferrerTierEventService } from '../events/set-referrer-tier-event/set-referrer-tier-event.service';
import { SetTierEventService } from '../events/set-tier-event/set-tier-event.service';
import { SetTraderReferralCodeEventService } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.service';

interface ReferralState {
  code: string;
  owner: string;
  tierId: string;
  discountShare: string;
  lastProcessedBlock: number;
}

@Injectable()
export class ReferralV2Service {
  private readonly BATCH_SIZE = 300000; // Number of blocks per batch
  private readonly SAVE_BATCH_SIZE = 1000; // Number of referrals to save at once

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
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

  async getReferralsByOwner(owner: string, chainId?: number): Promise<ReferralCode[]> {
    const queryBuilder = this.referralCodeRepository.createQueryBuilder('referral');
    
    queryBuilder.where('LOWER(referral.owner) = LOWER(:owner)', { owner });
    
    if (chainId) {
      queryBuilder.andWhere('referral.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getMany();
  }

  async getReferralsByTrader(trader: string, chainId?: number): Promise<ReferralCode[]> {
    const queryBuilder = this.referralCodeRepository.createQueryBuilder('referral')
      .innerJoin('referral.traders', 'trader', 'LOWER(trader.account) = LOWER(:trader)', { trader });
    
    if (chainId) {
      queryBuilder.andWhere('referral.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getMany();
  }

  async getReferralsByCode(code: string, chainId?: number): Promise<ReferralCode[]> {
    const queryBuilder = this.referralCodeRepository.createQueryBuilder('referral');
    
    queryBuilder.where('referral.code = :code', { code });
    
    if (chainId) {
      queryBuilder.andWhere('referral.chainId = :chainId', { chainId });
    }
    
    return queryBuilder.getMany();
  }

  async getReferralStats(chainId?: number): Promise<any> {
    const queryBuilder = this.referralCodeRepository.createQueryBuilder('referral');
    
    if (chainId) {
      queryBuilder.where('referral.chainId = :chainId', { chainId });
    }
    
    const stats = await queryBuilder
      .select([
        'COUNT(DISTINCT referral.owner) as totalOwners',
        'COUNT(DISTINCT referral.code) as totalCodes',
        'COUNT(DISTINCT trader.account) as totalTraders'
      ])
      .leftJoin('referral.traders', 'trader')
      .getRawOne();
      
    return stats;
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