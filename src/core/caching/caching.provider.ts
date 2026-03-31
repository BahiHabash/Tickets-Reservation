import { Provider, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHING_CLIENT } from './caching.constants';
import { RedisConfig } from '../config/configurations/redis.config';

export const cachingProvider: Provider = {
  provide: CACHING_CLIENT,
  useFactory: (redisConfig: RedisConfig): Redis => {
    const logger = new Logger('CachingProvider');

    const client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnecting — attempt ${times}, delay ${delay}ms`);
        return delay;
      },
    });

    client.on('connect', () => logger.log('Redis client connected'));
    client.on('error', (err) => logger.error('Redis client error', err));

    return client;
  },
  inject: [RedisConfig],
};
