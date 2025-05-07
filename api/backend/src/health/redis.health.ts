import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';
import { logError } from '../utils/logging.helper';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor() {
    super();
    // Configure Redis client with fallback options
    const redisOptions = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      connectTimeout: 10000, // 10 second timeout
      lazyConnect: true, // Don't connect immediately
    };

    // Try to use REDIS_URL if available, otherwise use options
    this.redis = process.env.REDIS_URL 
      ? new Redis(process.env.REDIS_URL, redisOptions)
      : new Redis(redisOptions);
  }

  async isHealthy(key: string) {
    try {
      // Check if Redis is connected
      if (this.redis.status !== 'ready') {
        return this.getStatus(key, false, { message: 'Redis is not ready' });
      }

      // Try to ping Redis
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch (error) {
      logError('Redis health check failed', error);
      throw new HealthCheckError(
        'RedisHealthCheckFailed',
        this.getStatus(key, false, { message: 'Redis connection failed' })
      );
    }
  }
} 