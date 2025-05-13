import { Interval } from '@nestjs/schedule';
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
import { DexScreenerService } from '../v1/dex-screener/dex-screener.service';
import { TvlService } from '../tvl/tvl.service';
import { Deployment, DeploymentService } from '../deployment/deployment.service';
import { ArbitrageExecutedEventService } from '../events/arbitrage-executed-event/arbitrage-executed-event.service';
import { VortexTokensTradedEventService } from '../events/vortex-tokens-traded-event/vortex-tokens-traded-event.service';
import { VortexTradingResetEventService } from '../events/vortex-trading-reset-event/vortex-trading-reset-event.service';
import { VortexFundsWithdrawnEventService } from '../events/vortex-funds-withdrawn-event/vortex-funds-withdrawn-event.service';
import { NotificationService } from '../notification/notification.service';
import { ActivityV2Service } from '../activity/activity-v2.service';
import { ProtectionRemovedEventService } from '../events/protection-removed-event/protection-removed-event.service';
import { ReferralV2Service } from '../referral/referral-v2.service';
import { CarbonPriceService } from '../carbon-price/carbon-price.service';

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
    private dexScreenerService: DexScreenerService,
    private tvlService: TvlService,
    private deploymentService: DeploymentService,
    private arbitrageExecutedEventService: ArbitrageExecutedEventService,
    private vortexTokensTradedEventService: VortexTokensTradedEventService,
    private vortexTradingResetEventService: VortexTradingResetEventService,
    private vortexFundsWithdrawnEventService: VortexFundsWithdrawnEventService,
    private notificationService: NotificationService,
    private protectionRemovedEventService: ProtectionRemovedEventService,
    private activityV2Service: ActivityV2Service,
    private referralV2Service: ReferralV2Service,
    private carbonPriceService: CarbonPriceService,
    @Inject('REDIS') private redis: any,
  ) {
    // Log all environment variables first
    this.logEnvironmentVariables();

    const shouldHarvest = this.configService.get('SHOULD_HARVEST');
    this.logger.log(`shouldHarvest: ${shouldHarvest}`);
    if (shouldHarvest?.startsWith('1')) {
      const deployments = this.deploymentService.getDeployments();
      deployments.forEach((deployment) => {
        const updateInterval = 5000; // Customize the interval as needed
        this.scheduleDeploymentUpdate(deployment, updateInterval);
      });
    }
  }

  private scheduleDeploymentUpdate(deployment: Deployment, interval: number) {
    setInterval(async () => {
      await this.updateDeployment(deployment);
    }, interval);
  }

  async updateDeployment(deployment: Deployment): Promise<void> {
    const deploymentKey = `${deployment.blockchainType}:${deployment.exchangeId}`;
    if (this.isUpdating[deploymentKey]) return;

    const isUpdating = await this.redis.client.get(`${CARBON_IS_UPDATING}:${deploymentKey}`);
    if (isUpdating === '1' && process.env.NODE_ENV === 'production') return;

    this.logger.log(`CARBON SERVICE - Started update cycle for ${deploymentKey}`);
    let endBlock = -12;

    const t = Date.now();
    try {
      this.isUpdating[deploymentKey] = true;
      const lockDuration = parseInt(this.configService.get('CARBON_LOCK_DURATION')) || 30;
      await this.redis.client.setex(`${CARBON_IS_UPDATING}:${deploymentKey}`, lockDuration, 1);

      if (endBlock === -12) {
        if (this.configService.get('IS_FORK') === '1') {
          endBlock = await this.harvesterService.latestBlock(deployment);
        } else {
          endBlock = (await this.harvesterService.latestBlock(deployment)) - 12;
        }
      }

      // handle PairCreated events
      await this.pairCreatedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished pairs creation events for ${deployment.exchangeId}`);

      // handle VortexTokensTraded events
      await this.vortexTokensTradedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished Vortex tokens traded events for ${deployment.exchangeId}`);

      // handle VortexTradingReset events
      await this.vortexTradingResetEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating vortex trading reset events for ${deployment.exchangeId}`);

      // handle ProtectionRemoved events
      await this.protectionRemovedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating protection removed events for ${deployment.exchangeId}`);

      if (deployment.contracts?.ReferralStorage) {
        // handle all referral events and state updates
        await this.referralV2Service.update(endBlock, deployment);
        this.logger.log(`CARBON SERVICE - Finished updating referral system for ${deployment.exchangeId}`);
      }

      // create tokens
      await this.tokenService.update(endBlock, deployment);
      const tokens = await this.tokenService.allByAddress(deployment);
      this.logger.log(`CARBON SERVICE - Finished tokens for ${deployment.exchangeId}`);

      // create pairs
      await this.pairService.update(endBlock, tokens, deployment);
      const pairs = await this.pairService.allAsDictionary(deployment);
      this.logger.log(`CARBON SERVICE - Finished pairs for ${deployment.exchangeId}`);

      // create strategies
      await this.strategyService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished strategies for ${deployment.exchangeId}`);

      // create trades
      await this.tokensTradedEventService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished trades for ${deployment.exchangeId}`);

      // update carbon price
      await this.carbonPriceService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating carbon price for ${deployment.exchangeId}`);

      // coingecko tickers
      await this.coingeckoService.update(deployment);
      this.logger.log(`CARBON SERVICE - Finished updating coingecko tickers for ${deployment.exchangeId}`);

      // trading fee events
      await this.tradingFeePpmUpdatedEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating trading fee events for ${deployment.exchangeId}`);

      // pair trading fee events
      await this.pairTradingFeePpmUpdatedEventService.update(endBlock, pairs, tokens, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating pair trading fee events for ${deployment.exchangeId}`);

      await this.voucherTransferEventService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating voucher transfer events for ${deployment.exchangeId}`);

      await this.activityV2Service.update(endBlock, deployment, tokens);
      this.logger.log(`CARBON SERVICE - Finished updating activities for ${deployment.exchangeId}`);

      await this.tvlService.update(endBlock, deployment);
      this.logger.log(`CARBON SERVICE - Finished updating tvl for ${deployment.exchangeId}`);

      // handle notifications
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

  @Interval(5000)
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
      await this.roiService.update(deployment);

      // analytics
      await this.analyticsService.update(deployment);

      // DexScreener
      await this.dexScreenerService.update(deployment);

      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    } catch (error) {
      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    }
  }
}
