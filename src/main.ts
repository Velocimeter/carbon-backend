import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    logger.log('Starting NestJS application...');
    
    const app = await NestFactory.create(AppModule, { 
      cors: {
        origin: '*',
        methods: '*',
        allowedHeaders: '*',
        credentials: false
      },
      logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Enable all log levels
    });
    
    logger.log('NestJS application created successfully');
    
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

    logger.log('Attempting to start server on port 3000...');
    try {
      logger.warn('[Debug] About to call app.listen()...');
      await app.listen(3000, '0.0.0.0').catch(e => {
        logger.error('[Debug] app.listen() rejected with:', e);
        throw e;
      });
      logger.log('Server successfully started and listening on port 3000');
      
      // Log the URL the app is running at
      const url = await app.getUrl();
      logger.log(`Application is running on: ${url}`);
    } catch (serverError) {
      logger.error('Failed to start server:', serverError);
      logger.error('Server start error details:', {
        code: serverError.code,
        errno: serverError.errno,
        syscall: serverError.syscall,
        address: serverError.address,
        port: serverError.port
      });
      logger.error('Server start error stack:', serverError.stack);
      throw serverError; // Re-throw to be caught by outer try-catch
    }
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    logger.error('Stack trace:', error.stack);
    
    // Log specific error types
    if (error.code === 'EADDRINUSE') {
      logger.error('Port 3000 is already in use. Make sure no other service is running on this port.');
    }
    
    // Exit with error
    process.exit(1);
  }
}

// Add error handling for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  process.exit(1);
});

bootstrap();