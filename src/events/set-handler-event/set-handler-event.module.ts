import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetHandlerEventService } from './set-handler-event.service';
import { SetHandlerEvent } from './set-handler-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [TypeOrmModule.forFeature([SetHandlerEvent]), HarvesterModule],
  providers: [SetHandlerEventService],
  exports: [SetHandlerEventService],
})
export class SetHandlerEventModule {}
