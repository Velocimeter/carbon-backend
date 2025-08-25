import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralCode } from './referral-code.entity';
import { ReferralState } from './referral-state.entity';
import { DeploymentModule } from '../deployment/deployment.module';
import { HarvesterModule } from '../harvester/harvester.module';
import { LastProcessedBlockModule } from '../last-processed-block/last-processed-block.module';
import { RegisterCodeEventModule } from '../events/register-code-event/register-code-event.module';
import { GovSetCodeOwnerEventModule } from '../events/gov-set-code-owner-event/gov-set-code-owner-event.module';
import { SetCodeOwnerEventModule } from '../events/set-code-owner-event/set-code-owner-event.module';
import { SetHandlerEventModule } from '../events/set-handler-event/set-handler-event.module';
import { SetReferrerDiscountShareEventModule } from '../events/set-referrer-discount-share-event/set-referrer-discount-share-event.module';
import { SetReferrerTierEventModule } from '../events/set-referrer-tier-event/set-referrer-tier-event.module';
import { SetTierEventModule } from '../events/set-tier-event/set-tier-event.module';
import { SetTraderReferralCodeEventModule } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.module';
import { ReferralV2Service } from './referral-v2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode, ReferralState]),
    DeploymentModule,
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
export class ReferralModule {}
