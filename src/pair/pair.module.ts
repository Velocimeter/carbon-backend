import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LastProcessedBlockModule } from '../last-processed-block/last-processed-block.module';
import { RedisModule } from '../redis/redis.module';
import { HarvesterModule } from '../harvester/harvester.module';
import { Pair } from './pair.entity';
import { PairService } from './pair.service';
import { PairController } from './pair.controller';
import { PairCreatedEventModule } from '../events/pair-created-event/pair-created-event.module';
import { ActivityV2 } from '../activity/activity-v2.entity';
import { DeploymentModule } from '../deployment/deployment.module';
import { TokenModule } from '../token/token.module';
import { VolumeModule } from '../volume/volume.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pair, ActivityV2]),
    LastProcessedBlockModule,
    RedisModule,
    HarvesterModule,
    PairCreatedEventModule,
    DeploymentModule,
    TokenModule,
    VolumeModule,
  ],
  providers: [ConfigService, PairService],
  exports: [PairService, TypeOrmModule.forFeature([Pair])],
  controllers: [PairController],
})
export class PairModule {}
