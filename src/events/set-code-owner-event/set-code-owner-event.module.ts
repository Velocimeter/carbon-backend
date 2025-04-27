import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetCodeOwnerEventService } from './set-code-owner-event.service';
import { ReferralCode } from '../../referral/entities/referral-code.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode]),
    HarvesterModule,
  ],
  providers: [SetCodeOwnerEventService],
  exports: [SetCodeOwnerEventService],
})
export class SetCodeOwnerEventModule {} 