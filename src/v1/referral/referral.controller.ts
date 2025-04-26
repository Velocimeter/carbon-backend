import { Controller, Get, Query, Logger, Param } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';

@ApiTags('referrals')
@Controller('v1/referrals')
@CacheTTL(1 * 1000) // Cache all referral endpoints for 1 second
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  @Get('relationships')
  @ApiOperation({ summary: 'Get all affiliate-trader relationships' })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getReferralRelationships(
    @Query('chainId') chainId?: number
  ) {
    this.logger.log(`Referral relationships request received${chainId ? ` for chainId: ${chainId}` : ''}`);
    const result = await this.referralService.getReferralRelationships(chainId);
    this.logger.log(`Returning response with ${result.length} entries`);
    this.logger.debug('Response structure sample:', {
      totalEntries: result.length,
      firstEntry: result[0],
      isOwnerGrouped: result[0]?.codes !== undefined
    });
    return result;
  }

  @Get('owner/:address')
  @ApiOperation({ summary: 'Get referral codes and traders for a specific owner address' })
  @ApiParam({ name: 'address', description: 'Owner address to query', type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getReferralsByOwner(
    @Param('address') address: string,
    @Query('chainId') chainId?: number
  ) {
    this.logger.log(`Getting referrals for owner: ${address}${chainId ? ` and chainId: ${chainId}` : ''}`);
    const allReferrals = await this.referralService.getReferralRelationships(chainId);
    const ownerReferrals = allReferrals.find(entry => entry.owner.toLowerCase() === address.toLowerCase());
    
    if (!ownerReferrals) {
      this.logger.log(`No referrals found for owner: ${address}`);
      return {
        owner: address.toLowerCase(),
        tierId: "0",
        totalRebate: "0",
        discountShare: "0",
        codes: []
      };
    }

    this.logger.log(`Found ${ownerReferrals.codes.length} codes for owner: ${address}`);
    return ownerReferrals;
  }
}
