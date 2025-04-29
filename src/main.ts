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
      snapshot: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    logger.log('Setting up CORS...');
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || /\.velocimeter\.xyz$/.test(origin) || 
            ['http://localhost:3000', 'http://localhost:3009', 
             'http://localhost:3008', 'http://localhost:8000', 
             'http://localhost:8001', 'https://graphene-v2-berachain-git-referrals-cre8r.vercel.app'].includes(origin) ||
            /\.vercel\.app$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
      exposedHeaders: 'Content-Length, Content-Type, Access-Control-Allow-Origin',
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    });
    logger.log('CORS setup complete');

    logger.log('Setting up middleware...');
    app.enableVersioning();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(new LoggingMiddleware().use);
    logger.log('Middleware setup complete');

    logger.log('Setting up Swagger...');
    const config = new DocumentBuilder()
      .setTitle('Carbon API')
      .setDescription('The Carbon API description')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);
    logger.log('Swagger setup complete');

    logger.log('Attempting HTTP server listen...');
    try {
      await app.listen(port);
      logger.log('HTTP server successfully started');
      logger.log(`Application is running on: http://localhost:${port}`);
    } catch (error) {
      logger.error('Failed to start HTTP server:', error);
      process.exit(1);
    }
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();
