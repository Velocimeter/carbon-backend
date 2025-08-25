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
import { GeckoTerminalModule } from './gecko-terminal/gecko-terminal.module';
import { ActivityModule } from './activity/activity.module';
import { StateModule } from './state/state.module';
import { ReferralModule } from '../referral/referral.module';
import { ReferralController } from './referral/referral.controller';
import { ReferralService } from './referral/referral.service';
import { ReferralState } from '../referral/referral-state.entity';
import { MerklModule } from './merkl/merkl.module';

@Module({
  imports: [
    CmcModule,
    RoiModule,
    CoingeckoModule,
    MarketRateModule,
    SimulatorModule,
    AnalyticsModule,
    DexScreenerModule,
    GeckoTerminalModule,
    ActivityModule,
    StateModule,
    ReferralModule,
    TypeOrmModule.forFeature([ReferralState]),
    MerklModule,
  ],
  controllers: [V1Controller, ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class V1Module {}
