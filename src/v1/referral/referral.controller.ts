import { Controller, Get, Query, Logger, Param } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CacheTTL } from '@nestjs/cache-manager';

@ApiTags('referrals')
@Controller('v1/:blockchainType/referrals')
@CacheTTL(1 * 1000) // Cache all referral endpoints for 1 second
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  @Get('relationships')
  @ApiOperation({ summary: 'Get all affiliate-trader relationships' })
  @ApiParam({ name: 'blockchainType', description: 'Type of blockchain (e.g. berachain, base)', type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getReferralRelationships(@Param('blockchainType') blockchainType: string, @Query('chainId') chainId?: number) {
    this.logger.log(
      `Referral relationships request received for ${blockchainType}${chainId ? ` and chainId: ${chainId}` : ''}`,
    );
    const result = await this.referralService.getReferralRelationships(blockchainType, chainId);
    this.logger.log(`Returning response with ${result.length} entries`);
    this.logger.debug('Response structure sample:', {
      totalEntries: result.length,
      firstEntry: result[0],
      isOwnerGrouped: result[0]?.codes !== undefined,
    });
    return result;
  }

  @Get('owner/:address')
  @ApiOperation({ summary: 'Get referral codes and traders for a specific owner address' })
  @ApiParam({ name: 'blockchainType', description: 'Type of blockchain (e.g. berachain, base)', type: String })
  @ApiParam({ name: 'address', description: 'Owner address to query', type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getReferralsByOwner(
    @Param('blockchainType') blockchainType: string,
    @Param('address') address: string,
    @Query('chainId') chainId?: number,
  ) {
    this.logger.log(
      `Getting referrals for owner: ${address} on ${blockchainType}${chainId ? ` and chainId: ${chainId}` : ''}`,
    );
    const allReferrals = await this.referralService.getReferralRelationships(blockchainType, chainId);
    const ownerReferrals = allReferrals.find((entry) => entry.owner.toLowerCase() === address.toLowerCase());

    if (!ownerReferrals) {
      this.logger.log(`No referrals found for owner: ${address}`);
      return {
        owner: address.toLowerCase(),
        tierId: '0',
        totalRebate: '0',
        discountShare: '0',
        codes: [],
      };
    }

    this.logger.log(`Found ${ownerReferrals.codes.length} codes for owner: ${address}`);
    return ownerReferrals;
  }

  @Get('trader/:address')
  @ApiOperation({ summary: 'Get trader code, owner, and tier information for a specific address' })
  @ApiParam({ name: 'blockchainType', description: 'Type of blockchain (e.g. berachain, base)', type: String })
  @ApiParam({ name: 'address', description: 'Trader address to query', type: String })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getTraderCode(
    @Param('blockchainType') blockchainType: string,
    @Param('address') address: string,
    @Query('chainId') chainId?: number,
  ) {
    this.logger.log(
      `Getting trader code, owner and tier info for address: ${address} on ${blockchainType}${
        chainId ? ` and chainId: ${chainId}` : ''
      }`,
    );
    const result = await this.referralService.getTraderCode(blockchainType, address, chainId);
    return result;
  }
}
