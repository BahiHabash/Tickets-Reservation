import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisConfig } from '../config/configurations/redis.config';
import { AppConfigModule } from '../config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (redisConfig: RedisConfig) => ({
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password || undefined,
        },
      }),
      inject: [RedisConfig],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
