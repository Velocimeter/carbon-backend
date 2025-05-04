import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  let app;

  try {
    logger.log('=== PHASE 1: Creating NestJS Application ===');
    app = await NestFactory.create(AppModule, {
      cors: {
        origin: '*',
        methods: '*',
        allowedHeaders: '*',
        credentials: false,
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
      
      // Get the HTTP server instance before we start listening
      const server = app.getHttpServer();
      
      // Log initial server state
      logger.log('Initial server state:', {
        listening: server.listening,
        address: server.address(),
      });

      // Try listening without explicit host binding first
      await app.listen(3000)
        .then(async () => {
          const serverInfo = server.address();
          logger.log('Server successfully bound to:', {
            port: serverInfo.port,
            address: serverInfo.address,
            family: serverInfo.family,
          });
          logger.log(`Application is running on: ${await app.getUrl()}`);
          
          // Add more detailed periodic checks
          setInterval(() => {
            const status = {
              listening: server.listening,
              address: server.address(),
              connections: server.connections,
              maxConnections: server.maxConnections,
            };
            logger.log('Server status check:', status);
          }, 30000);
        })
        .catch(async (error) => {
          logger.error('Failed to bind to default address, trying 0.0.0.0:', error);
          
          // If default binding fails, try explicit 0.0.0.0
          await app.listen(3000, '0.0.0.0');
          const serverInfo = server.address();
          logger.log('Server successfully bound to 0.0.0.0:', {
            port: serverInfo.port,
            address: serverInfo.address,
            family: serverInfo.family,
          });
        });

      logger.log('app.listen() completed successfully');
      logger.log('HTTP Server successfully started and listening');

      // Enable graceful shutdown
      const signals = ['SIGTERM', 'SIGINT'];
      signals.forEach(signal => {
        process.on(signal, async () => {
          logger.log(`Received ${signal}, starting graceful shutdown...`);
          try {
            // Stop accepting new requests
            await app.close();
            logger.log('Successfully closed NestJS application');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
          }
        });
      });

    } catch (error) {
      logger.error('Failed during app.listen():', error);
      logger.error('Stack trace:', error.stack);
      throw error; // Let the outer try-catch handle process.exit
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
