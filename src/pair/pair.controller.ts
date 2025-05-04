import { Controller, Get, Header, Query } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { DeploymentService, ExchangeId } from '../deployment/deployment.service';
import { ApiExchangeIdParam, ExchangeIdParam } from '../exchange-id-param.decorator';
import { PairService } from './pair.service';
import { TokenService } from '../token/token.service';
import { VolumeService } from '../volume/volume.service';
import { ApiTags } from '@nestjs/swagger';
import { PairQueryDto } from './pair.dto';
import { VolumePairsDto } from '../v1/analytics/volume.pairs.dto';

@ApiTags('pairs')
@Controller({ version: '1', path: ':exchangeId?/pairs' })
export class PairController {
  constructor(
    private pairService: PairService,
    private deploymentService: DeploymentService,
    private tokenService: TokenService,
    private volumeService: VolumeService,
  ) {}

  @Get()
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  async getAllPairs(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: PairQueryDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const [pairs, total] = await this.pairService.findWithFilters(deployment, query);
    return {
      data: pairs,
      pagination: {
        total,
        offset: query.offset || 0,
        limit: query.limit,
      },
    };
  }

  @Get('volume')
  @CacheTTL(1 * 60 * 1000)
  @Header('Cache-Control', 'public, max-age=60')
  @ApiExchangeIdParam()
  async getPairsWithVolume(@ExchangeIdParam() exchangeId: ExchangeId, @Query() query: PairQueryDto): Promise<any> {
    const deployment = this.deploymentService.getDeploymentByExchangeId(exchangeId);
    const tokens = await this.tokenService.allByAddress(deployment);
    const [pairs, total] = await this.pairService.findWithFilters(deployment, query);

    // Create volume query
    const volumeQuery = new VolumePairsDto();
    volumeQuery.pairs = pairs.map((pair) => ({
      token0: pair.token0.address,
      token1: pair.token1.address,
    }));
    volumeQuery.start = query.start;
    volumeQuery.end = query.end;
    volumeQuery.ownerId = query.ownerId;

    const volumeData = await this.volumeService.getVolume(
      deployment,
      volumeQuery,
      tokens,
      await this.pairService.allAsDictionary(deployment),
    );

    return {
      data: volumeData,
      pagination: {
        total,
        offset: query.offset || 0,
        limit: query.limit,
      },
    };
  }
}
