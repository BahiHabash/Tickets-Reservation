import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './core/config';
import { WideEventLoggerService } from './core/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // App configurations class
  const appConfig = app.get(AppConfig);

  // Custom logger
  const logger = app.get(WideEventLoggerService);
  app.useLogger(logger);

  // Global prefix from config (e.g. "api/v1")
  app.setGlobalPrefix(appConfig.apiVersion);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = appConfig.port;
  await app.listen(port);

  logger.log(`Application running on ${appConfig.apiUrl}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
});
