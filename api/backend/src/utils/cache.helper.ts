import Redis from 'ioredis';
import { logError } from './logging.helper';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheQuery(key: string, data: any, ttl: number) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (error) {
    logError('Failed to cache query', error);
  }
}

export async function getCachedQuery(key: string) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logError('Failed to retrieve cached query', error);
    return null;
  }
}

export async function rateLimit(key: string, limit: number, window: number) {
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, window);
    }
    if (current > limit) {
      throw new Error('Rate limit exceeded');
    }
  } catch (error) {
    logError('Rate limiting error', error);
    throw error;
  }
} 