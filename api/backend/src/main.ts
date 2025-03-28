import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import * as csurf from 'csurf';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import pino from 'pino-http';
import logger from './utils/logging.helper';

async function bootstrap() {
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

  // Apply CSRF protection middleware
  app.use(csurf({ cookie: true }));

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
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Replace with your allowed domains
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

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
