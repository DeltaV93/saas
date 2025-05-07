import Redis from 'ioredis';
import { logError } from './logging.helper';

// Configure Redis client with fallback options and error handling
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
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis(redisOptions);

// Handle Redis connection errors
redis.on('error', (error) => {
  logError('Redis connection error', error);
  // Don't crash the application on Redis connection errors
});

// Track Redis connection status
let isRedisConnected = false;
redis.on('connect', () => {
  isRedisConnected = true;
  console.log('Redis connected successfully');
});
redis.on('close', () => {
  isRedisConnected = false;
  console.log('Redis connection closed');
});

export async function cacheQuery(key: string, data: any, ttl: number) {
  try {
    if (!isRedisConnected) {
      logError('Redis not connected, skipping cache operation', null);
      return;
    }
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (error) {
    logError('Failed to cache query', error);
  }
}

export async function getCachedQuery(key: string) {
  try {
    if (!isRedisConnected) {
      logError('Redis not connected, skipping cache retrieval', null);
      return null;
    }
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logError('Failed to retrieve cached query', error);
    return null;
  }
}

export async function rateLimit(key: string, limit: number, window: number) {
  try {
    if (!isRedisConnected) {
      // If Redis is not available, skip rate limiting but don't block the request
      return;
    }
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, window);
    }
    if (current > limit) {
      throw new Error('Rate limit exceeded');
    }
  } catch (error) {
    logError('Rate limiting error', error);
    // Don't throw the error if it's a Redis connection issue
    if (error.message !== 'Rate limit exceeded') {
      return;
    }
    throw error;
  }
} 