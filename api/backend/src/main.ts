import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import * as csurf from 'csurf';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import pino from 'pino-http';
import logger from './utils/logging.helper';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Log important environment variables (without sensitive data)
logger.info(`Starting application in ${process.env.NODE_ENV || 'development'} mode`);
logger.info(`Redis configuration: ${process.env.REDIS_URL ? 'Using REDIS_URL' : 'Using default Redis configuration'}`);

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: false, // Disable default logger
    });

    // Set up Swagger
    const config = new DocumentBuilder()
      .setTitle('Template API Documentation')
      .setDescription('API documentation for the template application')
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // Apply Helmet middleware for secure HTTP headers
    app.use(helmet());

    // Apply CSRF protection middleware (only if not in test mode)
    if (process.env.NODE_ENV !== 'test') {
      app.use(csurf({ cookie: true }));
    }

    // Apply rate limiting middleware
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
      })
    );

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://localhost:3001'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: false,
    });

    app.use(pino({
      logger,
      customLogLevel: (res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
      customSuccessMessage: (res) => {
        return `Request completed with status code ${res.statusCode}`;
      },
      customErrorMessage: (error, res) => {
        if (error instanceof Error) {
          return `Request failed with status code ${res.statusCode}: ${error.message}`;
        }
        return `Request failed with status code ${res.statusCode}`;
      },
    }));

    // Start the application
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.info(`Application is running on port ${port}`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: any) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit the process for non-critical errors
  if (error.code === 'ECONNREFUSED' && error.address === '127.0.0.1') {
    logger.warn('Redis connection refused. Application will continue without Redis.');
  } else {
    process.exit(1);
  }
});

bootstrap();
