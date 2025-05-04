import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { UpdaterService } from '../updater/updater.service';
import { DeploymentService } from '../deployment/deployment.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private updaterService: UpdaterService,
    private deploymentService: DeploymentService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const deployments = this.deploymentService.getDeployments();
        const blockchainStatus = {};
        let isHealthy = true;

        // Check each deployment's status
        deployments.forEach(deployment => {
          const deploymentKey = `${deployment.blockchainType}:${deployment.exchangeId}`;
          const isUpdating = this.updaterService.getIsUpdating(deploymentKey);
          const errorCount = this.updaterService.getErrorCount(deploymentKey);
          const lastUpdateTime = this.updaterService.getLastUpdateTime(deploymentKey);

          // Consider unhealthy if:
          // 1. Has more than 5 errors
          // 2. Not updating and should be updating
          // 3. Last update was more than 2 minutes ago
          const deploymentHealthy = errorCount < 5 && 
            (isUpdating || Date.now() - lastUpdateTime < 120000);

          blockchainStatus[deploymentKey] = {
            status: deploymentHealthy ? 'up' : 'down',
            isUpdating,
            errorCount,
            lastUpdateTime: new Date(lastUpdateTime).toISOString(),
          };

          if (!deploymentHealthy) isHealthy = false;
        });

        return {
          blockchain: {
            status: isHealthy ? 'up' : 'down',
            deployments: blockchainStatus,
          },
          server: {
            status: 'up',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
        };
      },
    ]);
  }
}
