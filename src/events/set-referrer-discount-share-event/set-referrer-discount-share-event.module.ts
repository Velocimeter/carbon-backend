import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetReferrerDiscountShareEventService } from './set-referrer-discount-share-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetReferrerDiscountShareEventService],
  exports: [SetReferrerDiscountShareEventService],
})
export class SetReferrerDiscountShareEventModule {} 