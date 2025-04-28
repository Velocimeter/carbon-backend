import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmcModule } from './cmc/cmc.module';
import { RoiModule } from './roi/roi.module';
import { CoingeckoModule } from './coingecko/coingecko.module';
import { MarketRateModule } from './market-rate/market-rate.module';
import { V1Controller } from './v1.controller';
import { SimulatorModule } from './simulator/simulator.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DexScreenerModule } from './dex-screener/dex-screener.module';
import { ActivityModule } from './activity/activity.module';
import { StateModule } from './state/state.module';
import { ReferralModule } from '../referral/referral.module';
import { ReferralController } from './referral/referral.controller';
import { ReferralService } from './referral/referral.service';
import { ReferralCode } from '../referral/entities/referral-code.entity';
import { SetTraderReferralCodeEvent } from '../events/set-trader-referral-code-event/set-trader-referral-code-event.entity';
import { SetReferrerTierEvent } from '../events/set-referrer-tier-event/set-referrer-tier-event.entity';
import { SetTierEvent } from '../events/set-tier-event/set-tier-event.entity';

@Module({
  imports: [
    CmcModule,
    RoiModule,
    CoingeckoModule,
    MarketRateModule,
    SimulatorModule,
    AnalyticsModule,
    DexScreenerModule,
    ActivityModule,
    StateModule,
    ReferralModule,
    TypeOrmModule.forFeature([
      ReferralCode, 
      SetTraderReferralCodeEvent,
      SetReferrerTierEvent,
      SetTierEvent
    ]),
  ],
  controllers: [V1Controller, ReferralController],
  providers: [ReferralService],
})
export class V1Module {}
