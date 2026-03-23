import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WideEventLog, WideEventLogSchema } from './wide-event.schema';
import { WideEventLoggerService } from './logger.service';
import { LoggerMiddleware } from './logger.middleware';
import { WideEventInterceptor } from './logger.interceptor';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WideEventLog.name, schema: WideEventLogSchema },
    ]),
  ],
  providers: [
    WideEventLoggerService,
    LoggerMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: WideEventInterceptor,
    },
  ],
  exports: [WideEventLoggerService, LoggerMiddleware],
})
export class LoggerModule {}
