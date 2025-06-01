import { Module, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import * as session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { logError } from '../utils/logging.helper';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

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
const redisClient = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis(redisOptions);

// Handle Redis connection errors
redisClient.on('error', (error) => {
  logError('Redis connection error in auth module', error);
  // Don't crash the application on Redis connection errors
});

// Create Redis store for sessions
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'myapp:',
});

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    // Use memory store as fallback if Redis is not available
    const sessionOptions = {
      secret: process.env.SESSION_SECRET || 'fallback_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24, // 1 day expiration
      },
    };

    // Only use Redis store if Redis is connected and ready
    if (redisClient.status === 'ready') {
      sessionOptions['store'] = redisStore;
    } else {
      logError('Redis not ready, using memory store for sessions', null);
    }

    consumer
      .apply(session(sessionOptions))
      .forRoutes('*');
  }
}
