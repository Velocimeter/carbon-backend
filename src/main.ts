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
    
    // Add health check endpoint
    app.getHttpAdapter().get('/healthz', (req, res) => {
      res.status(200).send('OK');
    });
    logger.log('Health check endpoint configured at /healthz');
    
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
    
    // Pre-flight checks
    logger.log('Running pre-flight checks...');
    
    // Check if we can create a test server to verify port availability
    const net = require('net');
    const testServer = new net.Server();
    
    try {
      await new Promise((resolve, reject) => {
        testServer.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error('Port 3000 is already in use'));
          } else {
            reject(err);
          }
        });
        
        testServer.once('listening', () => {
          testServer.close();
          resolve(true);
        });
        
        testServer.listen(3000, '0.0.0.0');
      });
      
      logger.log('Pre-flight check passed: Port 3000 is available');
    } catch (error) {
      logger.error('Pre-flight check failed:', error);
      throw error;
    }

    logger.log('Attempting to start HTTP server on port 3000...');
    
    // Start the HTTP server
    try {
      const httpServer = await app.listen(3000, '0.0.0.0');
      
      // Add error handler to catch any server issues after startup
      httpServer.on('error', (error) => {
        logger.error('HTTP Server error:', error);
        logger.error('Error details:', {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address,
          port: error.port
        });
        
        // Log specific error types
        switch (error.code) {
          case 'EADDRINUSE':
            logger.error('Port 3000 is already in use by another process');
            break;
          case 'EACCES':
            logger.error('Permission denied to bind to port 3000');
            break;
          case 'EADDRNOTAVAIL':
            logger.error('The 0.0.0.0 address is not available');
            break;
          default:
            logger.error('Unknown server error occurred');
        }
        
        process.exit(1); // Exit on server error so Northflank can restart
      });

      logger.log('HTTP Server successfully started and listening on port 3000');
      const url = await app.getUrl();
      logger.log(`API is now accessible at: ${url}`);

      // Test if server is actually accepting requests
      try {
        const http = require('http');
        const testRequest = http.get('http://localhost:3000', (res) => {
          logger.log('Server is confirmed to be accepting connections - status code:', res.statusCode);
        });
        testRequest.on('error', (err) => {
          logger.error('Failed to connect to own server:', err);
        });
      } catch (error) {
        logger.error('Failed to test server connection:', error);
      }
    } catch (listenError) {
      logger.error('Failed to start HTTP Server:', listenError);
      logger.error('Error details:', {
        name: listenError.name,
        message: listenError.message,
        code: listenError.code,
        errno: listenError.errno,
        syscall: listenError.syscall,
        address: listenError.address,
        port: listenError.port
      });
      
      // Log common error scenarios
      if (listenError.code === 'EADDRINUSE') {
        logger.error('Port 3000 is already in use. Check for other processes using this port.');
      } else if (listenError.code === 'EACCES') {
        logger.error('Permission denied. Check if you have rights to bind to port 3000.');
      } else if (listenError.code === 'EADDRNOTAVAIL') {
        logger.error('Cannot bind to 0.0.0.0. Check network interface configuration.');
      }
      
      process.exit(1); // Exit if we can't start the server
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