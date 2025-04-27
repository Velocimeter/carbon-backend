import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetReferrerTierEventService } from './set-referrer-tier-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetReferrerTierEventService],
  exports: [SetReferrerTierEventService],
})
export class SetReferrerTierEventModule {} 