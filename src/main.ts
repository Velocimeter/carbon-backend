import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingMiddleware } from './logging.middleware';

async function bootstrap() {
  // Log the Redis URL for debugging
  console.log('⚠️ Environment variable check:');
  console.log('REDIS_URL:', process.env.REDIS_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  const app = await NestFactory.create(AppModule, {
    snapshot: true
  });
  
  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      console.log(`CORS request from origin: ${origin}`);
      if (!origin || /\.velocimeter\.xyz$/.test(origin) || 
          ['http://localhost:3000', 'http://localhost:3009', 
           'http://localhost:3008', 'http://localhost:8000', 
           'http://localhost:8001', 'https://graphene-v2-berachain-git-referrals-cre8r.vercel.app'].includes(origin) ||
          /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS rejected for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  app.enableVersioning();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.use(new LoggingMiddleware().use);

  const config = new DocumentBuilder()
    .setTitle('Carbon API')
    .setDescription('The Carbon API description')
    .setVersion('1.0')
    .addTag('activity', 'Activity endpoints')
    .addTag('analytics', 'Analytics endpoints')
    .addTag('cmc', 'CoinMarketCap endpoints')
    .addTag('coingecko', 'CoinGecko endpoints')
    .addTag('roi', 'ROI endpoints')
    .addTag('simulator', 'Simulator endpoints')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
