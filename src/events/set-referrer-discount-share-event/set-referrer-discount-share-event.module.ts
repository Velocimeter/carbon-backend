import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetReferrerDiscountShareEventService } from './set-referrer-discount-share-event.service';
import { SetReferrerDiscountShareEvent } from './set-referrer-discount-share-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [TypeOrmModule.forFeature([SetReferrerDiscountShareEvent]), HarvesterModule],
  providers: [SetReferrerDiscountShareEventService],
  exports: [SetReferrerDiscountShareEventService],
})
export class SetReferrerDiscountShareEventModule {}
