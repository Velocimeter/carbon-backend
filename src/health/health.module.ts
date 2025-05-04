import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { UpdaterModule } from '../updater/updater.module';
import { DeploymentModule } from '../deployment/deployment.module';

@Module({
  imports: [
    TerminusModule,
    UpdaterModule,
    DeploymentModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {} 