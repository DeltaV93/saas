import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, HealthIndicatorResult, HealthIndicatorStatus } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      // Check if the API is responding
      () => this.http.pingCheck('api', 'http://localhost:3000/api'),
      
      // Check Redis health
      async () => {
        try {
          return await this.redis.isHealthy('redis');
        } catch (error) {
          // If Redis check fails, return a degraded status instead of failing the entire health check
          const degradedStatus: HealthIndicatorResult = {
            redis: {
              status: 'down' as HealthIndicatorStatus,
              message: 'Redis is not available, but the application is still running',
            },
          };
          return degradedStatus;
        }
      },
    ]);
  }
} 