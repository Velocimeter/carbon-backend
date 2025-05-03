import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    cors: {
      origin: '*',
      methods: '*',
      allowedHeaders: '*',
      credentials: false
    },
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Enable all log levels
  });
  
  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Carbon API')
    .setDescription('The Carbon API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, document);

  await app.listen(3000, '0.0.0.0'); // Listening on all interfaces
}

bootstrap();