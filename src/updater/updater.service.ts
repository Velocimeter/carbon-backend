// removed Interval decorator due to runtime util.isString incompatibility with current Node version
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { HarvesterService } from '../harvester/harvester.service';
import { TokenService } from '../token/token.service';
import { PairService } from '../pair/pair.service';
import { PairCreatedEventService } from '../events/pair-created-event/pair-created-event.service';
import { StrategyService } from '../strategy/strategy.service';
import { TokensTradedEventService } from '../events/tokens-traded-event/tokens-traded-event.service';
import { RoiService } from '../v1/roi/roi.service';
import { CoingeckoService } from '../v1/coingecko/coingecko.service';
import { PairTradingFeePpmUpdatedEventService } from '../events/pair-trading-fee-ppm-updated-event/pair-trading-fee-ppm-updated-event.service';
import { TradingFeePpmUpdatedEventService } from '../events/trading-fee-ppm-updated-event/trading-fee-ppm-updated-event.service';
import { VoucherTransferEventService } from '../events/voucher-transfer-event/voucher-transfer-event.service';
import { AnalyticsService } from '../v1/analytics/analytics.service';
import { DexScreenerV2Service } from '../v1/dex-screener/dex-screener-v2.service';
import { TvlService } from '../tvl/tvl.service';
import { Deployment, DeploymentService } from '../deployment/deployment.service';
import { ArbitrageExecutedEventService } from '../events/arbitrage-executed-event/arbitrage-executed-event.service';
import { ArbitrageExecutedEventServiceV2 } from '../events/arbitrage-executed-event-v2/arbitrage-executed-event-v2.service';
import { VortexTokensTradedEventService } from '../events/vortex-tokens-traded-event/vortex-tokens-traded-event.service';
import { VortexTradingResetEventService } from '../events/vortex-trading-reset-event/vortex-trading-reset-event.service';
import { VortexFundsWithdrawnEventService } from '../events/vortex-funds-withdrawn-event/vortex-funds-withdrawn-event.service';
import { NotificationService } from '../notification/notification.service';
import { ActivityV2Service } from '../activity/activity-v2.service';
import { ProtectionRemovedEventService } from '../events/protection-removed-event/protection-removed-event.service';
import { ReferralV2Service } from '../referral/referral-v2.service';
import { CarbonPriceService } from '../carbon-price/carbon-price.service';
import { QuoteService } from '../quote/quote.service';
import { HistoricQuoteService } from '../historic-quote/historic-quote.service';
import { MerklProcessorService } from '../merkl/services/merkl-processor.service';

export const CARBON_IS_UPDATING = 'carbon:isUpdating';
export const CARBON_IS_UPDATING_ANALYTICS = 'carbon:isUpdatingAnalytics';

@Injectable()
export class UpdaterService {
  private readonly logger = new Logger(UpdaterService.name);
  private isUpdating: Record<string, boolean> = {};
  private isUpdatingAnalytics: Record<string, boolean> = {};
  private serviceErrors: Record<string, number> = {}; // Track error counts

  private logEnvironmentVariables() {
    this.logger.log('=== Carbon Service Environment Configuration ===');

    // Core Settings
    this.logger.log('\nCore Settings:');
    this.logger.log(`- SHOULD_HARVEST: ${this.configService.get('SHOULD_HARVEST')}`);
    this.logger.log(`- SHOULD_UPDATE_ANALYTICS: ${this.configService.get('SHOULD_UPDATE_ANALYTICS')}`);
    this.logger.log(`- IS_FORK: ${this.configService.get('IS_FORK')}`);
    this.logger.log(`- CARBON_LOCK_DURATION: ${this.configService.get('CARBON_LOCK_DURATION')}`);

    // RPC Endpoints
    this.logger.log('\nRPC Endpoints:');
    this.logger.log(`- IOTA_RPC_ENDPOINT: ${this.configService.get('IOTA_RPC_ENDPOINT')}`);
    this.logger.log(`- BASE_RPC_ENDPOINT: ${this.configService.get('BASE_RPC_ENDPOINT')}`);
    this.logger.log(`- MANTLE_RPC_ENDPOINT: ${this.configService.get('MANTLE_RPC_ENDPOINT')}`);
    this.logger.log(`- BERACHAIN_RPC_ENDPOINT: ${this.configService.get('BERACHAIN_RPC_ENDPOINT')}`);
    this.logger.log(`- SONIC_RPC_ENDPOINT: ${this.configService.get('SONIC_RPC_ENDPOINT')}`);
    this.logger.log(`- FANTOM_RPC_ENDPOINT: ${this.configService.get('FANTOM_RPC_ENDPOINT')}`);

    // Active Deployments
    const deployments = this.deploymentService.getDeployments();
    this.logger.log('\nActive Deployments:');
    deployments.forEach((deployment) => {
      this.logger.log(`\n${deployment.blockchainType} (${deployment.exchangeId}):`);
      this.logger.log(`- RPC: ${deployment.rpcEndpoint}`);
      this.logger.log(`- Start Block: ${deployment.startBlock}`);
      this.logger.log(`- Batch Size: ${deployment.harvestEventsBatchSize}`);
      this.logger.log(`- Concurrency: ${deployment.harvestConcurrency}`);
      this.logger.log(`- Multicall: ${deployment.multicallAddress}`);
    });

    // Redis Configuration
    this.logger.log('\nRedis Configuration:');
    this.logger.log(`- REDIS_URL: ${this.configService.get('REDIS_URL')}`);

    // Database Configuration
    const dbUrl = this.configService.get('DATABASE_URL');
    this.logger.log('\nDatabase Configuration:');
    this.logger.log(`- DATABASE_URL: ${dbUrl ? dbUrl.replace(/\/\/.*@/, '//****:****@') : 'not set'}`);

    // API Configuration
    this.logger.log('\nAPI Configuration:');
    this.logger.log(`- API_URL: ${this.configService.get('API_URL')}`);
    const coingeckoKey = this.configService.get('COINGECKO_API_KEY');
    this.logger.log(`- COINGECKO_API_KEY: ${coingeckoKey ? coingeckoKey.slice(0, 8) + '...' : 'not set'}`);

    // Polling Settings
    this.logger.log('\nPolling Settings:');
    this.logger.log(`- POLL_QUOTES_INTERVAL: ${this.configService.get('POLL_QUOTES_INTERVAL')}`);
    this.logger.log(`- SHOULD_POLL_QUOTES: ${this.configService.get('SHOULD_POLL_QUOTES')}`);
    this.logger.log(`- POLL_HISTORIC_QUOTES_INTERVAL: ${this.configService.get('POLL_HISTORIC_QUOTES_INTERVAL')}`);
    this.logger.log(`- SHOULD_POLL_HISTORIC_QUOTES: ${this.configService.get('SHOULD_POLL_HISTORIC_QUOTES')}`);

    this.logger.log('\n=== End Configuration ===\n');
  }

  constructor(
    private configService: ConfigService,
    private harvesterService: HarvesterService,
    private tokenService: TokenService,
    private pairService: PairService,
    private pairCreatedEventService: PairCreatedEventService,
    private strategyService: StrategyService,
    private tokensTradedEventService: TokensTradedEventService,
    private roiService: RoiService,
    private coingeckoService: CoingeckoService,
    private tradingFeePpmUpdatedEventService: TradingFeePpmUpdatedEventService,
    private pairTradingFeePpmUpdatedEventService: PairTradingFeePpmUpdatedEventService,
    private voucherTransferEventService: VoucherTransferEventService,
    private analyticsService: AnalyticsService,
    private dexScreenerV2Service: DexScreenerV2Service,
    private tvlService: TvlService,
    private deploymentService: DeploymentService,
    private arbitrageExecutedEventService: ArbitrageExecutedEventService,
    private arbitrageExecutedEventServiceV2: ArbitrageExecutedEventServiceV2,
    private vortexTokensTradedEventService: VortexTokensTradedEventService,
    private vortexTradingResetEventService: VortexTradingResetEventService,
    private vortexFundsWithdrawnEventService: VortexFundsWithdrawnEventService,
    private notificationService: NotificationService,
    private protectionRemovedEventService: ProtectionRemovedEventService,
    private activityV2Service: ActivityV2Service,
    private referralV2Service: ReferralV2Service,
    private carbonPriceService: CarbonPriceService,
    private quoteService: QuoteService,
    private historicQuoteService: HistoricQuoteService,
    private merklProcessorService: MerklProcessorService,
    @Inject('REDIS') private redis: any,
  ) {
    // Log all environment variables first
    this.logEnvironmentVariables();

    const shouldHarvest = this.configService.get('SHOULD_HARVEST');
    this.logger.log(`shouldHarvest: ${shouldHarvest}`);
    if (shouldHarvest?.startsWith('1')) {
      const deployments = this.deploymentService.getDeployments();
      deployments.forEach((deployment) => {
        const updateInterval = 125000; // Customize the interval as needed [interval]
        this.logger.log(
          `Scheduling update loop for ${deployment.blockchainType}:${deployment.exchangeId} every ${updateInterval}ms`,
        );
        this.scheduleDeploymentUpdate(deployment, updateInterval);
      });
    } else {
      this.logger.warn('Updater disabled: SHOULD_HARVEST is not set to 1.');
    }

    // Schedule analytics updates without using @Interval decorator
    const shouldUpdateAnalytics = this.configService.get('SHOULD_UPDATE_ANALYTICS');
    if (shouldUpdateAnalytics === '1') {
      setInterval(async () => {
        await this.updateAnalytics();
      }, 5000); // [interval]
    }
  }

  private scheduleDeploymentUpdate(deployment: Deployment, interval: number) {
    setInterval(async () => {
      this.logger.log(
        `initiating updateDeployment for ${deployment.blockchainType}:${deployment.exchangeId} at ${new Date().toISOString()}`,
      );
      await this.updateDeployment(deployment);
    }, interval); // [interval]
  }

  async updateDeployment(deployment: Deployment): Promise<void> {
    const deploymentKey = `${deployment.blockchainType}:${deployment.exchangeId}`;
    if (this.isUpdating[deploymentKey]) {
      this.logger.log(`Skip update for ${deploymentKey}: local isUpdating flag is true`);
      return;
    }

    const isUpdating = await this.redis.client.get(`${CARBON_IS_UPDATING}:${deploymentKey}`);
    if (isUpdating === '1' && process.env.NODE_ENV === 'production') {
      this.logger.log(`Skip update for ${deploymentKey}: redis lock present in production`);
      return;
    }

    this.logger.log(`CARBON SERVICE - Started update cycle for ${deploymentKey}`);
    let endBlock = -12;

    const t = Date.now();
    try {
      this.isUpdating[deploymentKey] = true;
      const lockDuration = parseInt(this.configService.get('CARBON_LOCK_DURATION')) || 120;
      await this.redis.client.setex(`${CARBON_IS_UPDATING}:${deploymentKey}`, lockDuration, 1);

      if (endBlock === -12) {
        if (this.configService.get('IS_FORK') === '1') {
          endBlock = await this.harvesterService.latestBlock(deployment);
        } else {
          endBlock = (await this.harvesterService.latestBlock(deployment)) - 12;
        }
      }
      this.logger.log(`Resolved endBlock=${endBlock} for ${deploymentKey}`);

      // handle PairCreated events
      this.logger.log(`Starting PairCreatedEventService for ${deploymentKey}...`);
      await this.pairCreatedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished pairs creation events for ${deployment.exchangeId}`);

      // handle VortexTokensTraded events
      this.logger.log(`Starting VortexTokensTradedEventService for ${deploymentKey}...`);
      await this.vortexTokensTradedEventService.update(endBlock, deployment);
      console.log(`CARBON SERVICE - Finished Vortex tokens traded events for ${deployment.exchangeId}`);

      // handle ArbitrageExecuted events
      this.logger.log(`Starting ArbitrageExecutedEventService for ${deploymentKey}...`);
      await this.arbitrageExecutedEventService.update(endBlock, deployment);
      console.log(`CARBON SERVICE - Finished updating arbitrage executed events for ${deployment.exchangeId}`);

      // handle ArbitrageExecuted V2 events (optional; skip if table missing)
      this.logger.log(`Starting ArbitrageExecutedEventServiceV2 for ${deploymentKey}...`);
      try {
        await this.arbitrageExecutedEventServiceV2.update(endBlock, deployment);
        console.log(`CARBON SERVICE - Finished updating arbitrage executed V2 events for ${deployment.exchangeId}`);
      } catch (e) {
        const code = (e as any)?.driverError?.code || (e as any)?.code;
        const msg = ((e as any)?.message || String(e)) as string;
        const missing = code === '42P01' || (msg && msg.includes('arbitrage-executed-events-v2') && msg.includes('does not exist'));
        if (missing) {
          this.logger.warn(`Skipping ArbitrageExecutedEventServiceV2 for ${deploymentKey}: table missing`);
        } else {
          this.logger.warn(`Continuing after ArbitrageExecutedEventServiceV2 error for ${deploymentKey}: ${msg}`);
        }
      }

      // handle VortexTradingReset events
      this.logger.log(`Starting VortexTradingResetEventService for ${deploymentKey}...`);
      await this.vortexTradingResetEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating vortex trading reset events for ${deployment.exchangeId}`);

      // handle ProtectionRemoved events
      this.logger.log(`Starting ProtectionRemovedEventService for ${deploymentKey}...`);
      await this.protectionRemovedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating protection removed events for ${deployment.exchangeId}`);

      if (deployment.contracts?.ReferralStorage) {
        // handle all referral events and state updates
        await this.referralV2Service.update(endBlock, deployment);
        this.logger.log(`CARBON SERVICE - Finished updating referral system for ${deployment.exchangeId}`);
      }

      // create tokens
      this.logger.log(`Starting TokenService for ${deploymentKey}...`);
      await this.tokenService.update(endBlock, deployment);
      const tokens = await this.tokenService.allByAddress(deployment);
      this.logger.log(`CARBON SERVICE - Finished tokens for ${deployment.exchangeId}`);

      // create pairs
      this.logger.log(`Starting PairService for ${deploymentKey}...`);
      await this.pairService.update(endBlock, tokens, deployment);
      const pairs = await this.pairService.allAsDictionary(deployment);
      this.logger.log(`CARBON SERVICE - Finished pairs for ${deployment.exchangeId}`);

      // create strategies
      this.logger.log(`Starting StrategyService for ${deploymentKey}...`);
      await this.strategyService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished strategies for ${deployment.exchangeId}`);

      // create trades
      this.logger.log(`Starting TokensTradedEventService for ${deploymentKey}...`);
      await this.tokensTradedEventService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished trades for ${deployment.exchangeId}`);

      // update carbon price
      this.logger.log(`Starting CarbonPriceService for ${deploymentKey}...`);
      await this.carbonPriceService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating carbon price for ${deployment.exchangeId}`);

      // coingecko tickers - fetch quotes first and pass them to update method
      const quotesCTE = await this.quoteService.prepareQuotesForQuery(deployment);
      this.logger.log(`Starting quotes CoingeckoService for ${deploymentKey}...`);
      await this.coingeckoService.update(deployment, quotesCTE);
      console.log(`CARBON SERVICE - Finished updating coingecko tickers for ${deployment.exchangeId}`);

      // DexScreener V2 - incremental processing
      this.logger.log(`Starting DexScreenerV2Service for ${deploymentKey}...`);
      await this.dexScreenerV2Service.update(endBlock, deployment, tokens);
      console.log(`CARBON SERVICE - Finished updating DexScreener V2 for ${deployment.exchangeId}`);

      // trading fee events
      this.logger.log(`Starting TradingFeePpmUpdatedEventService for ${deploymentKey}...`);
      await this.tradingFeePpmUpdatedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating trading fee events for ${deployment.exchangeId}`);

      // pair trading fee events
      this.logger.log(`Starting PairTradingFeePpmUpdatedEventService for ${deploymentKey}...`);
      await this.pairTradingFeePpmUpdatedEventService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating pair trading fee events for ${deployment.exchangeId}`);

      this.logger.log(`Starting VoucherTransferEventService for ${deploymentKey}...`);
      await this.voucherTransferEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating voucher transfer events for ${deployment.exchangeId}`);

      this.logger.log(`Starting ActivityV2Service for ${deploymentKey}...`);
      await this.activityV2Service.update(endBlock, deployment, tokens);
      console.log(`CARBON SERVICE - Finished updating activities for ${deployment.exchangeId}`);

      // update merkl rewards
      this.logger.log(`Starting Merkl update for ${deploymentKey}...`);
      await this.merklProcessorService.update(endBlock, deployment);
      console.log(`CARBON SERVICE - Finished updating merkl rewards for ${deployment.exchangeId}`);

      this.logger.log(`Starting TvlService for ${deploymentKey}...`);
      await this.tvlService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating tvl for ${deployment.exchangeId}`);

      // handle notifications
      this.logger.log(`Starting NotificationService for ${deploymentKey}...`);
      await this.notificationService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished notifications for ${deployment.exchangeId}`);

      this.logger.log(`CARBON SERVICE - Finished update iteration for ${deploymentKey} in:`, Date.now() - t, 'ms');
      this.isUpdating[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING}:${deploymentKey}`, 0);
    } catch (error) {
      this.logger.log(`error in carbon updater for ${deploymentKey}`, error, Date.now() - t);
      this.isUpdating[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING}:${deploymentKey}`, 0);
    }
  }

  async updateAnalytics(): Promise<any> {
    const shouldUpdateAnalytics = this.configService.get('SHOULD_UPDATE_ANALYTICS');
    if (shouldUpdateAnalytics !== '1') return;

    const deployments = this.deploymentService.getDeployments();
    await Promise.all(deployments.map((deployment) => this.updateDeploymentAnalytics(deployment)));
  }

  async updateDeploymentAnalytics(deployment: Deployment): Promise<void> {
    const deploymentKey = `${deployment.blockchainType}:${deployment.exchangeId}`;
    if (this.isUpdatingAnalytics[deploymentKey]) return;

    const isUpdatingAnalytics = await this.redis.client.get(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`);
    if (isUpdatingAnalytics === '1' && process.env.NODE_ENV === 'production') return;

    const t = Date.now();

    try {
      this.isUpdatingAnalytics[deploymentKey] = true;
      const lockDuration = parseInt(this.configService.get('CARBON_LOCK_DURATION')) || 120;
      await this.redis.client.setex(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, lockDuration, 1);

      // ROI
      const allQuotes = await this.quoteService.allByAddress(deployment);
      const quotes = Object.values(allQuotes);
      await this.roiService.update(deployment, quotes);
      console.log(`CARBON SERVICE - Finished updating ROI for ${deployment.exchangeId}`);

      // analytics
      const quotesCTE = await this.quoteService.prepareQuotesForQuery(deployment);
      const tokens = await this.tokenService.allByAddress(deployment);
      const historicQuotesCTE = await this.historicQuoteService.prepareHistoricQuotesForQuery(deployment, tokens);
      await this.analyticsService.update(deployment, quotesCTE, historicQuotesCTE);

      // coingecko tickers
      await this.coingeckoService.update(deployment, quotesCTE);
      console.log(`CARBON SERVICE - Finished updating coingecko tickers for ${deployment.exchangeId}`);

      // total tvl
      await this.tvlService.updateTotalTvl(deployment);
      console.log(`CARBON SERVICE - Finished updating total tvl for ${deployment.exchangeId}`);

      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    } catch (error) {
      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    }
  }
}
