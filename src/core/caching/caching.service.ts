import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHING_CLIENT } from './caching.constants';

@Injectable()
export class CachingService implements OnModuleDestroy {
  constructor(@Inject(CACHING_CLIENT) public readonly client: Redis) {}

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string | number,
    ttlMs?: number,
  ): Promise<void> {
    if (ttlMs) {
      await this.client.set(key, value, 'PX', ttlMs);
    } else {
      await this.client.set(key, value);
    }
  }

  async setEx(
    key: string,
    value: string | number,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async hset(key: string, data: Record<string, any>): Promise<void> {
    await this.client.hset(key, data);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async pexpire(key: string, ttlMs: number): Promise<void> {
    await this.client.pexpire(key, ttlMs);
  }

  async eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown> {
    return this.client.eval(script, numKeys, ...args);
  }

  async acquireLock(key: string, ttlMs: number = 30000): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.client.set(lockKey, 'LOCK', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.del(lockKey);
  }
}
