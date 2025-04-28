import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetTraderReferralCodeEventService } from './set-trader-referral-code-event.service';
import { SetTraderReferralCodeEvent } from './set-trader-referral-code-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SetTraderReferralCodeEvent]),
    HarvesterModule,
  ],
  providers: [SetTraderReferralCodeEventService],
  exports: [SetTraderReferralCodeEventService],
})
export class SetTraderReferralCodeEventModule {} 