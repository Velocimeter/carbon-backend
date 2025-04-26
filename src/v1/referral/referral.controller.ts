import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('referrals')
@Controller('v1/referrals')
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
}
