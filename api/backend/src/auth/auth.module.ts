import { Module, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import * as session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'myapp:',
});

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        session({
          store: redisStore,
          secret: process.env.SESSION_SECRET,
          resave: false,
          saveUninitialized: false,
          cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24, // 1 day expiration
          },
        })
      )
      .forRoutes('*');
  }
}
