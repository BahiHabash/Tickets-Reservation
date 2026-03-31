import { Injectable } from '@nestjs/common';
import { CachingService } from './caching.service';
import { LoggingService } from '../logging';

@Injectable()
export class DistributedLockService {
  constructor(
    private readonly cachingService: CachingService,
    private readonly logger: LoggingService,
  ) {}

  private getLockKey(key: string): string {
    return `lock:${key}`;
  }

  /**
   * Acquire a distributed lock (Mutex) for safe parallel event consumption.
   *
   * @param key The string to lock on (e.g. bookingId)
   * @param ttlMs Time-to-live for the lock in milliseconds
   * @returns True if lock was acquired, false if collision
   */
  async acquireLock(key: string, ttlMs: number = 5000): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const result = await this.cachingService.client.set(
      lockKey,
      'LOCKED',
      'PX',
      ttlMs,
      'NX',
    );

    this.logger.assign({
      messages: [
        `Lock ${result === 'OK' ? 'acquired' : 'not acquired'} for key ${key}`,
      ],
    });

    return result === 'OK';
  }

  /**
   * Release a previously acquired distributed lock.
   *
   * @param key The lock key (e.g. bookingId)
   */
  async releaseLock(key: string): Promise<void> {
    await this.cachingService.del(this.getLockKey(key));
    this.logger.assign({
      messages: [`Lock released for key ${key}`],
    });
  }
}
