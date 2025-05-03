import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    logger.log('=== PHASE 1: Creating NestJS Application ===');
    const app = await NestFactory.create(AppModule, { 
      cors: {
        origin: '*',
        methods: '*',
        allowedHeaders: '*',
        credentials: false
      },
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    logger.log('NestJS application instance created');
    
    logger.log('=== PHASE 2: Configuring Application ===');
    // Enable API versioning
    app.enableVersioning({
      type: VersioningType.URI,
    });
    logger.log('API versioning enabled');

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    logger.log('Global validation pipe configured');

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());
    logger.log('Global logging interceptor configured');

    const config = new DocumentBuilder()
      .setTitle('Carbon API')
      .setDescription('The Carbon API description')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);
    logger.log('Swagger documentation setup complete');

    logger.log('=== PHASE 3: Starting HTTP Server ===');
    try {
      logger.log('About to call app.listen()...');
      await app.listen(3000, '0.0.0.0');
      logger.log('app.listen() completed successfully');
      logger.log('HTTP Server successfully started and listening on port 3000');
    } catch (error) {
      logger.error('Failed during app.listen():', error);
      logger.error('Stack trace:', error.stack);
      throw error;  // Let the outer try-catch handle process.exit
    }
    
  } catch (error) {
    logger.error('Critical bootstrap error:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Add error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  process.exit(1);
});

bootstrap();