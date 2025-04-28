import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvesterModule } from '../../harvester/harvester.module';
import { GovSetCodeOwnerEventService } from './gov-set-code-owner-event.service';
import { GovSetCodeOwnerEvent } from '../../referral/entities/depreciated_events/gov-set-code-owner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GovSetCodeOwnerEvent]),
    HarvesterModule,
  ],
  providers: [GovSetCodeOwnerEventService],
  exports: [GovSetCodeOwnerEventService],
})
export class GovSetCodeOwnerEventModule {} 