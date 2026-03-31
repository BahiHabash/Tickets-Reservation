import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { CachingModule } from './caching';
import { QueueModule } from './queue';
import { LoggingModule } from './logging';
import { JwtModule } from './jwt';

@Global()
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CachingModule,
    QueueModule,
    LoggingModule,
    JwtModule,
    EventEmitterModule.forRoot(),
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    CachingModule,
    QueueModule,
    LoggingModule,
    JwtModule,
  ],
})
export class CoreModule {}
