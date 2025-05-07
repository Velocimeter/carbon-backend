import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { AnalyticsService } from './analytics.service';
import { VolumeTokensDto } from './volume.tokens.dto';
import { TvlTokensDto } from './tvl.tokens.dto';
import { VolumeService } from '../../volume/volume.service';
import { TvlService } from '../../tvl/tvl.service';
import { DeploymentService, ExchangeId } from '../../deployment/deployment.service';
import { ApiExchangeIdParam, ExchangeIdParam } from '../../exchange-id-param.decorator';
import { PairService } from '../../pair/pair.service';
import { TvlPairsDto } from './tvl.pairs.dto';
import { TotalTvlDto } from './tvl.total.dto';
import { TokenService } from '../../token/token.service';
import { VolumePairsDto } from './volume.pairs.dto';
import { VolumeTotalDto } from './volume.total.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: ':exchangeId?/analytics' })
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private volumeService: VolumeService,
    private tvlService: TvlService,
    private deploymentService: DeploymentService,
    private pairService: PairService,
    private tokenService: TokenService,
  ) {}

  @Get('tvl/tokens')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('TVL')
  async tvlByTokens(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: TvlTokensDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    return this.tvlService.getTvlByAddress(deployment, query);
  }

  @Get('tvl/pairs')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('TVL')
  async tvlByPair(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: TvlPairsDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const pairs = await this.pairService.allAsDictionary(deployment);
    return this.tvlService.getTvlByPair(deployment, query, pairs);
  }

  @Get('tvl')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('TVL')
  async tvl(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: TotalTvlDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    return this.tvlService.getTotalTvl(deployment, query);
  }

  @Get('volume/tokens')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Volume - Timestamped')
  @ApiOperation({ summary: 'Get token volume data with timestamp segmentation' })
  async volumeByTokens(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: VolumeTokensDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const tokens = await this.tokenService.allByAddress(deployment);
    return this.volumeService.getVolume(deployment, query, tokens);
  }

  @Get('volume/tokens/aggregate')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Volume - Aggregated')
  @ApiOperation({ summary: 'Get token volume data without timestamp segmentation. If no addresses specified, all tokens will be used.' })
  async volumeByTokensAggregate(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: VolumeTotalDto): Promise<any> {
    console.log('[AnalyticsController] Retrieving aggregate token volume data without timestamps');
    console.log('[AnalyticsController] Query params:', {
      exchangeId,
      ...query,
      addresses: query.addresses ? (
        Array.isArray(query.addresses) ? 
          `${query.addresses.length} addresses` : 
          typeof query.addresses
      ) : 'none'
    });
    
    try {
      const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
      console.log('[AnalyticsController] Got deployment:', {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId
      });
      
      const tokens = await this.tokenService.allByAddress(deployment);
      console.log(`[AnalyticsController] Retrieved ${Object.keys(tokens).length} tokens from token service`);
      
      // Log some sample tokens to verify data structure
      const sampleTokenAddresses = Object.keys(tokens).slice(0, 3);
      if (sampleTokenAddresses.length > 0) {
        console.log('[AnalyticsController] Sample tokens:', sampleTokenAddresses.map(addr => ({
          address: addr,
          id: tokens[addr].id,
          symbol: tokens[addr].symbol,
          decimals: tokens[addr].decimals
        })));
      }
      
      // Log the parameters for debugging
      if (query.addresses && Array.isArray(query.addresses) && query.addresses.length > 0) {
        console.log(`[AnalyticsController] Processing aggregate volume for ${query.addresses.length} specific tokens`);
        // Check if the specified addresses exist in our tokens map
        const foundTokens = query.addresses.filter(addr => tokens[addr.toLowerCase()]);
        console.log(`[AnalyticsController] Found ${foundTokens.length} out of ${query.addresses.length} requested tokens`);
      } else {
        console.log('[AnalyticsController] No token addresses specified, using all tokens');
      }
      
      console.log('[AnalyticsController] Calling volume service getTotalVolumeByAddress...');
      // Use the direct method that avoids time bucketing
      const volumeData = await this.volumeService.getTotalVolumeByAddress(deployment, query, tokens);
      console.log(`[AnalyticsController] Retrieved ${volumeData?.length || 0} tokens with volume data`);
      
      if (!volumeData || volumeData.length === 0) {
        console.log('[AnalyticsController] WARNING: No volume data returned from service');
      } else {
        console.log('[AnalyticsController] First item in volume data:', volumeData[0]);
      }
      
      return volumeData;
    } catch (error) {
      console.error('[AnalyticsController] Error in volumeByTokensAggregate:', error);
      throw error;
    }
  }

  @Get('volume/pairs')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Volume - Timestamped')
  @ApiOperation({ summary: 'Get pair volume data with timestamp segmentation' })
  async volumeByPairs(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: VolumePairsDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const tokens = await this.tokenService.allByAddress(deployment);
    const pairs = await this.pairService.allAsDictionary(deployment);
    
    // Check if we should aggregate without timestamps
    if (query.aggregateTotal === true) {
      console.log('[AnalyticsController] Using direct aggregated volume data for pairs (no timestamps)');
      return this.volumeService.getTotalVolumeByPair(deployment, query, tokens, pairs);
    }
    
    // Use regular timestamp-based data
    return this.volumeService.getVolume(deployment, query, tokens, pairs);
  }

  @Get('volume/pairs/aggregate')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Volume - Aggregated')
  @ApiOperation({ summary: 'Get aggregated volume data for pairs without timestamp segmentation. If no pairs specified, all pairs will be used.' })
  async volumeByPairsAggregate(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: VolumePairsDto): Promise<any> {
    console.log('[AnalyticsController] Retrieving aggregate pair volume data without timestamps');
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const tokens = await this.tokenService.allByAddress(deployment);
    const pairs = await this.pairService.allAsDictionary(deployment);
    
    // If no pairs specified, use all pairs
    if (!query.pairs || query.pairs.length === 0) {
      console.log('[AnalyticsController] No pairs specified, using all pairs');
      const allPairs = await this.pairService.all(deployment);
      
      // Create new query with all pairs
      const allPairsQuery = new VolumePairsDto();
      allPairsQuery.start = query.start;
      allPairsQuery.end = query.end;
      allPairsQuery.offset = query.offset;
      allPairsQuery.limit = query.limit;
      allPairsQuery.ownerId = query.ownerId;
      allPairsQuery.pairs = allPairs.map((pair) => ({
        token0: pair.token0.address,
        token1: pair.token1.address,
      }));
      
      // Use the modified query
      return this.volumeService.getTotalVolumeByPair(deployment, allPairsQuery, tokens, pairs);
    }
    
    // Log the number of pairs received
    console.log(`[AnalyticsController] Processing aggregate volume for ${query.pairs.length} pairs`);
    
    // Use the direct non-timestamped method with the specified pairs
    return this.volumeService.getTotalVolumeByPair(deployment, query, tokens, pairs);
  }

  @Get('volume')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Volume - Timestamped')
  @ApiOperation({ summary: 'Get total volume data with timestamp segmentation, use aggregateTotal=true for non-timestamped data' })
  async volumeTotal(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: VolumeTotalDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const tokens = await this.tokenService.allByAddress(deployment);
    
    // Check if we should use non-timestamped data
    if (query.aggregateTotal === true) {
      console.log('[AnalyticsController] Using direct non-timestamped volume data');
      return this.volumeService.getTotalVolumeByAddress(deployment, query, tokens);
    }
    
    // Return regular timestamp-based data
    return this.volumeService.getVolume(deployment, query, tokens);
  }

  @Get('generic')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Analytics')
  async generic(@ExchangeIdParam() exchangeId: ExchangeId): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    return this.analyticsService.getCachedGenericMetrics(deployment);
  }

  @Get('trades_count')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Analytics')
  async tradeCount(@ExchangeIdParam() exchangeId: ExchangeId): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    return this.analyticsService.getCachedTradesCount(deployment);
  }

  @Get('trending')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  @ApiTags('Analytics')
  async trending(@ExchangeIdParam() exchangeId: ExchangeId): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    return this.analyticsService.getCachedTrending(deployment);
  }
}
