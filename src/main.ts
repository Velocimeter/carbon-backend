import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingMiddleware } from './logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      console.log('Incoming origin:', origin);  // Debug log
      if (!origin || /\.velocimeter\.xyz$/.test(origin) || 
          ['http://localhost:3000', 'http://localhost:3001', 
           'http://localhost:8000', 'http://localhost:8001'].includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

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

  await app.listen(3000);
}

bootstrap();
