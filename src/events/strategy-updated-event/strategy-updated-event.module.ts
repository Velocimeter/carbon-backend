import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvesterModule } from '../../harvester/harvester.module';
import { StrategyUpdatedEvent } from './strategy-updated-event.entity';
import { StrategyUpdatedEventService } from './strategy-updated-event.service';
import { TokensTradedEvent } from '../tokens-traded-event/tokens-traded-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyUpdatedEvent, TokensTradedEvent]),
    HarvesterModule,
  ],
  providers: [ConfigService, StrategyUpdatedEventService],
  exports: [
    StrategyUpdatedEventService,
    TypeOrmModule.forFeature([StrategyUpdatedEvent]),
  ],
})
export class StrategyUpdatedEventModule {}
