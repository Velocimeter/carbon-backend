import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegisterCodeEventService } from './register-code-event.service';
import { RegisterCodeEvent } from './register-code-event.entity';
import { HarvesterModule } from '../../harvester/harvester.module';

@Module({
  imports: [TypeOrmModule.forFeature([RegisterCodeEvent]), HarvesterModule],
  providers: [RegisterCodeEventService],
  exports: [RegisterCodeEventService],
})
export class RegisterCodeEventModule {}
