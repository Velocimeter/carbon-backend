import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetCodeOwnerEventService } from './set-code-owner-event.service';
import { SetCodeOwnerEvent } from './set-code-owner-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [TypeOrmModule.forFeature([SetCodeOwnerEvent]), HarvesterModule],
  providers: [SetCodeOwnerEventService],
  exports: [SetCodeOwnerEventService],
})
export class SetCodeOwnerEventModule {}
