import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetTierEventService } from './set-tier-event.service';
import { SetTierEvent } from './set-tier-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [TypeOrmModule.forFeature([SetTierEvent]), HarvesterModule],
  providers: [SetTierEventService],
  exports: [SetTierEventService],
})
export class SetTierEventModule {}
