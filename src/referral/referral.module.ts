import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ReferralEventService } from './referral-event.service';
import { ReferralCode } from './entities/referral-code.entity';
import { GovSetCodeOwnerEvent } from './entities/events/gov-set-code-owner.entity';
import { SetCodeOwnerEvent } from './entities/events/set-code-owner.entity';
import { SetHandlerEvent } from './entities/events/set-handler.entity';
import { SetReferrerDiscountShareEvent } from './entities/events/set-referrer-discount-share.entity';
import { SetReferrerTierEvent } from './entities/events/set-referrer-tier.entity';
import { SetTierEvent } from './entities/events/set-tier.entity';
import { SetTraderReferralCodeEvent } from './entities/events/set-trader-referral-code.entity';
import { ReferralHarvester } from './referral-harvester';
import { TraderStats } from './entities/trader-stats.entity';
import { ReferrerStats } from './entities/referrer-stats.entity';
import { DeploymentModule } from '../deployment/deployment.module';
import { HarvesterModule } from '../harvester/harvester.module';
import { LastProcessedBlockModule } from '../last-processed-block/last-processed-block.module';

@Module({
  imports: [
    ConfigModule,
    DeploymentModule,
    forwardRef(() => HarvesterModule),
    LastProcessedBlockModule,
    TypeOrmModule.forFeature([
      ReferralCode,
      GovSetCodeOwnerEvent,
      SetCodeOwnerEvent,
      SetHandlerEvent,
      SetReferrerDiscountShareEvent,
      SetReferrerTierEvent,
      SetTierEvent,
      SetTraderReferralCodeEvent,
      TraderStats,
      ReferrerStats,
    ]),
  ],
  providers: [
    ReferralEventService,
    ReferralHarvester
  ],
  exports: [
    ReferralEventService,
    ReferralHarvester
  ],
})
export class ReferralModule {} 