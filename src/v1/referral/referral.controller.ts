import { Controller, Get, Query } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('referrals')
@Controller('v1/referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('relationships')
  @ApiOperation({ summary: 'Get all affiliate-trader relationships' })
  @ApiQuery({ name: 'chainId', required: false, type: Number })
  async getReferralRelationships(
    @Query('chainId') chainId?: number
  ) {
    return this.referralService.getReferralRelationships(chainId);
  }
}
