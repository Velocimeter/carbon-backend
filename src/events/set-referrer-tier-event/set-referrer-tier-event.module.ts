import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetReferrerTierEventService } from './set-referrer-tier-event.service';
import { SetReferrerTierEvent } from './set-referrer-tier-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SetReferrerTierEvent]),
    HarvesterModule,
  ],
  providers: [SetReferrerTierEventService],
  exports: [SetReferrerTierEventService],
})
export class SetReferrerTierEventModule {} 