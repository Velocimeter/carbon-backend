import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetTraderReferralCodeEventService } from './set-trader-referral-code-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetTraderReferralCodeEventService],
  exports: [SetTraderReferralCodeEventService],
})
export class SetTraderReferralCodeEventModule {} 