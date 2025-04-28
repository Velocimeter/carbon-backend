import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvesterModule } from '../harvester/harvester.module';
import { LastProcessedBlockModule } from '../last-processed-block/last-processed-block.module';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralState } from './entities/referral-state.entity';
import { ReferralV2Service } from './referral-v2.service';
import { RegisterCodeEventModule } from '../events/register-code-event/register-code-event.module';
import { GovSetCodeOwnerEventModule } from '../events/gov-set-code-owner-event/gov-set-code-owner-event.module';
import { SetCodeOwnerEventModule } from '../events/set-code-owner-event/set-code-owner-event.module';
import { SetHandlerEventModule } from '../events/set-handler-event/set-handler-event.module';
import { SetReferrerDiscountShareEventModule } from '../events/set-referrer-discount-share-event/set-referrer-discount-share-event.module';
import { SetReferrerTierEventModule } from '../events/set-referrer-tier-event/set-referrer-tier-event.module';
import { SetTierEventModule } from '../events/set-tier-event/set-tier-event.module';
import { SetTraderReferralCodeEventModule } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode, ReferralState]),
    HarvesterModule,
    LastProcessedBlockModule,
    RegisterCodeEventModule,
    GovSetCodeOwnerEventModule,
    SetCodeOwnerEventModule,
    SetHandlerEventModule,
    SetReferrerDiscountShareEventModule,
    SetReferrerTierEventModule,
    SetTierEventModule,
    SetTraderReferralCodeEventModule,
  ],
  providers: [ReferralV2Service],
  exports: [ReferralV2Service],
})
export class ReferralV2Module {} 