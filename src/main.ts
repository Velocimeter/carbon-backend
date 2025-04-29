import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingMiddleware } from './logging.middleware';

if (process.env.NODE_ENV !== 'production') {
  // Only override in non-production environments
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ override: true });
}

async function bootstrap() {
  // Create logger instance
  const logger = new Logger('Bootstrap');
  
  // Log environment variables
  logger.log('⚠️ Environment variable check:');
  logger.log(`REDIS_URL: ${process.env.REDIS_URL}`);
  logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
  const port = process.env.PORT || 3000;
  logger.log(`PORT will be set to: ${port}`);
  
  try {
    logger.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule, { 
      cors: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    logger.log('Configuring application...');
    app.enableVersioning();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(new LoggingMiddleware().use);

    const config = new DocumentBuilder()
      .setTitle('Carbon API')
      .setDescription('The Carbon API description')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);

    logger.log(`About to start server on port ${port}...`);
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
