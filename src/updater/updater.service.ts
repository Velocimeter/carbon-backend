import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
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
export const CARBON_IS_UPDATING = 'carbon:isUpdating';
export const CARBON_IS_UPDATING_ANALYTICS = 'carbon:isUpdatingAnalytics';

@Injectable()
export class UpdaterService {
  private isUpdating: Record<string, boolean> = {};
  private isUpdatingAnalytics: Record<string, boolean> = {};

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
    @Inject('REDIS') private redis: any,
  ) {
    const shouldHarvest = this.configService.get('SHOULD_HARVEST');
    if (shouldHarvest === '1') {
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

    console.log(`CARBON SERVICE - Started update cycle for ${deploymentKey}`);
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

      let tokens, pairs;
      const services = [
        { name: 'PairCreatedEventService', fn: async () => await this.pairCreatedEventService.update(endBlock, deployment) },
        { name: 'VortexTokensTradedEventService', fn: async () => await this.vortexTokensTradedEventService.update(endBlock, deployment) },
        { name: 'ArbitrageExecutedEventService', fn: async () => await this.arbitrageExecutedEventService.update(endBlock, deployment) },
        { name: 'VortexTradingResetEventService', fn: async () => await this.vortexTradingResetEventService.update(endBlock, deployment) },
        { name: 'ProtectionRemovedEventService', fn: async () => await this.protectionRemovedEventService.update(endBlock, deployment) },
        { name: 'TokenService', fn: async () => {
          await this.tokenService.update(endBlock, deployment);
          tokens = await this.tokenService.allByAddress(deployment);
        }},
        { name: 'PairService', fn: async () => {
          await this.pairService.update(endBlock, tokens, deployment);
          pairs = await this.pairService.allAsDictionary(deployment);
        }},
        { name: 'StrategyService', fn: async () => await this.strategyService.update(endBlock, pairs, tokens, deployment) },
        { name: 'TokensTradedEventService', fn: async () => await this.tokensTradedEventService.update(endBlock, pairs, tokens, deployment) },
        { name: 'CoingeckoService', fn: async () => await this.coingeckoService.update(deployment) },
        { name: 'TradingFeePpmUpdatedEventService', fn: async () => await this.tradingFeePpmUpdatedEventService.update(endBlock, deployment) },
        { name: 'PairTradingFeePpmUpdatedEventService', fn: async () => await this.pairTradingFeePpmUpdatedEventService.update(endBlock, pairs, tokens, deployment) },
        { name: 'VoucherTransferEventService', fn: async () => await this.voucherTransferEventService.update(endBlock, deployment) },
        { name: 'ActivityV2Service', fn: async () => await this.activityV2Service.update(endBlock, deployment, tokens) },
        { name: 'TvlService', fn: async () => await this.tvlService.update(endBlock, deployment) },
        { name: 'NotificationService', fn: async () => await this.notificationService.update(endBlock, deployment) }
      ];

      for (const service of services) {
        try {
          await service.fn();
          console.log(`CARBON SERVICE - Finished ${service.name} for ${deployment.exchangeId}`);
        } catch (error) {
          console.log(`error in carbon updater for ${deploymentKey} in ${service.name}:`, error, Date.now() - t);
          throw error;
        }
      }

      console.log(`CARBON SERVICE - Finished update iteration for ${deploymentKey} in:`, Date.now() - t, 'ms');
      this.isUpdating[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING}:${deploymentKey}`, 0);
    } catch (error) {
      console.log(`error in carbon updater for ${deploymentKey}:`, error, Date.now() - t);
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

    console.log(`CARBON SERVICE - Started analytics update cycle for ${deploymentKey}`);
    const t = Date.now();

    try {
      this.isUpdatingAnalytics[deploymentKey] = true;
      const lockDuration = parseInt(this.configService.get('CARBON_LOCK_DURATION')) || 120;
      await this.redis.client.setex(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, lockDuration, 1);

      // ROI
      await this.roiService.update(deployment);
      console.log(`CARBON SERVICE - Finished updating ROI for ${deployment.exchangeId}`);

      // analytics
      await this.analyticsService.update(deployment);

      // DexScreener
      await this.dexScreenerService.update(deployment);
      console.log(`CARBON SERVICE - Finished updating DexScreener for ${deployment.exchangeId}`);

      console.log(`CARBON SERVICE - Finished updating analytics for ${deploymentKey} in:`, Date.now() - t, 'ms');
      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    } catch (error) {
      console.log(`error in carbon analytics updater for ${deploymentKey}`, error, Date.now() - t);
      this.isUpdatingAnalytics[deploymentKey] = false;
      await this.redis.client.set(`${CARBON_IS_UPDATING_ANALYTICS}:${deploymentKey}`, 0);
    }
  }
}
