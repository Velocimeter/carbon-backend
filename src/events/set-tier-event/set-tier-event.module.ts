import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetTierEventService } from './set-tier-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetTierEventService],
  exports: [SetTierEventService],
})
export class SetTierEventModule {} 