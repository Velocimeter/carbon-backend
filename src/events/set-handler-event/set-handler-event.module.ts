import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetHandlerEventService } from './set-handler-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetHandlerEventService],
  exports: [SetHandlerEventService],
})
export class SetHandlerEventModule {} 