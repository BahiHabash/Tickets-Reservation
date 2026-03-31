import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Logging, LoggingSchema } from './logging.schema';
import { LoggingService } from './logging.service';
import { LoggingMiddleware } from './logging.middleware';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Logging.name, schema: LoggingSchema }]),
  ],
  providers: [
    LoggingService,
    LoggingMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LoggingService, LoggingMiddleware],
})
export class LoggingModule {}
