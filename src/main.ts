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
  
  try {
    logger.log('Creating NestJS application...');
    // Create app with more verbose logging
    const app = await NestFactory.create(AppModule, {
      snapshot: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    logger.log('Configuring CORS...');
    // Configure CORS with detailed logging
    app.enableCors({
      origin: (origin, callback) => {
        logger.log(`CORS request from origin: ${origin || 'No origin'}`);
        if (!origin || /\.velocimeter\.xyz$/.test(origin) || 
            ['http://localhost:3000', 'http://localhost:3009', 
             'http://localhost:3008', 'http://localhost:8000', 
             'http://localhost:8001', 'https://graphene-v2-berachain-git-referrals-cre8r.vercel.app'].includes(origin) ||
            /\.vercel\.app$/.test(origin)) {
          logger.log(`CORS allowed for origin: ${origin || 'No origin'}`);
          callback(null, true);
        } else {
          logger.warn(`CORS rejected for origin: ${origin}`);
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

    // Log middleware registration
    logger.log('Registering global middleware and pipes');
    app.enableVersioning();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use((req, res, next) => {
      logger.debug(`Incoming request: ${req.method} ${req.url}`);
      next();
    });
    app.use(new LoggingMiddleware().use);

    const config = new DocumentBuilder()
      .setTitle('Carbon API')
      .setDescription('The Carbon API description')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);

    const port = process.env.PORT || 3000;
    logger.log('About to call app.listen()...');
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
