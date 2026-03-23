import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { RedisModule } from './redis';
import { LoggerModule } from './logger';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    LoggerModule,
    EventEmitterModule.forRoot(),
  ],
})
export class CoreModule {}
