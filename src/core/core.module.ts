import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config';
import { DatabaseModule } from './database';
import { RedisModule } from './redis';
import { LoggerModule } from './logger';
import { JwtModule } from './jwt';

@Global()
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    LoggerModule,
    JwtModule,
    EventEmitterModule.forRoot(),
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    LoggerModule,
    JwtModule,
  ],
})
export class CoreModule {}
