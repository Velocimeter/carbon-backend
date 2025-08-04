import { Module } from '@nestjs/common';
import { CoinGeckoController } from './coingecko.controller';
import { CoingeckoService } from './coingecko.service';
import { TokensTradedEventModule } from '../../events/tokens-traded-event/tokens-traded-event.module';
import { PairModule } from '../../pair/pair.module';
import { StrategyModule } from '../../strategy/strategy.module';
import { DeploymentModule } from '../../deployment/deployment.module';
import { QuoteModule } from '../../quote/quote.module';

@Module({
  imports: [TokensTradedEventModule, PairModule, StrategyModule, DeploymentModule, QuoteModule],
  controllers: [CoinGeckoController],
  providers: [CoingeckoService],
  exports: [CoingeckoService],
})
export class CoingeckoModule {}
