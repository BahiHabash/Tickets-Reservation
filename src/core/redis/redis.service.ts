import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_KEYS } from './redis.constants';
import { LoggingService } from '../logging';
import { RedisConfig } from '../config/configurations/redis.config';
import type { EventMeta } from '../../common/interfaces';
import type { EventStatus } from '../../modules/event/enums/event-status.enum';
import type { Currency } from '../../common/enums/money-currency.enum';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) public readonly client: Redis,
    private readonly logger: LoggingService,
    private readonly redisConfig: RedisConfig,
  ) {}

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  // ─── Key Helpers ────────────────────────────────────────────────

  getEventSlotsKey(eventId: string): string {
    return REDIS_KEYS.EVENT_SLOTS.replace('*', eventId);
  }

  getEventMetaKey(eventId: string): string {
    return REDIS_KEYS.EVENT_META.replace('*', eventId);
  }

  getIdempotencyKeyStr(key: string): string {
    return REDIS_KEYS.IDEMPOTENCY.replace('*', key);
  }

  getWebhookLockKey(bookingId: string): string {
    return REDIS_KEYS.BOOKING_LOCK.replace('*', bookingId);
  }

  getHoldKey(bookingId: string): string {
    return REDIS_KEYS.HOLD.replace('*', bookingId);
  }

  // ─── Event Slots (raw key ops used by AvailabilityService) ──────

  /**
   * Sets the initial available slots for an event.
   * TTL is calculated dynamically based on (eventDate - now).
   *
   * @param eventId The event ID
   * @param quantity Total capacity
   * @param eventDate The date of the event
   */
  async setEventSlots(
    eventId: string,
    quantity: number,
    eventDate: Date,
  ): Promise<void> {
    const key = this.getEventSlotsKey(eventId);
    const ttlSeconds = Math.max(
      0,
      Math.floor((eventDate.getTime() - Date.now()) / 1000),
    );

    if (ttlSeconds > 0) {
      await this.client.set(key, quantity, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, quantity);
    }

    this.logger.assign({
      messages: [`Slots set for event ${eventId} with TTL ${ttlSeconds}s`],
    });
  }

  /**
   * Deletes the event slots key entirely (used on event deletion/cancellation).
   *
   * @param eventId The event ID
   */
  async deleteEventSlots(eventId: string): Promise<void> {
    await this.client.del(this.getEventSlotsKey(eventId));
  }

  // ─── Event Metadata ─────────────────────────────────────────────

  /**
   * Cache event metadata as a Redis Hash.
   * TTL is managed by EVENT_META_TTL config constraint.
   *
   * @param eventId The event ID
   * @param meta Event metadata payload
   */
  async setEventMeta(eventId: string, meta: EventMeta): Promise<void> {
    const key = this.getEventMetaKey(eventId);
    await this.client.hset(key, {
      title: meta.title,
      price: String(meta.price),
      currency: meta.currency,
      date: meta.date,
      status: meta.status,
      capacity: String(meta.capacity),
    });

    await this.client.pexpire(key, this.redisConfig.eventMetaTtl);

    this.logger.assign({
      messages: [`Event meta cached in Redis — key: ${key}`],
    });
  }

  /**
   * Retrieve event metadata Hash.
   *
   * @param eventId The event ID
   * @returns The event metadata or null if missing
   */
  async getEventMeta(eventId: string): Promise<EventMeta | null> {
    const key = this.getEventMetaKey(eventId);
    const data = await this.client.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      title: data.title,
      price: Number(data.price),
      date: new Date(data.date),
      status: data.status as EventStatus,
      capacity: Number(data.capacity),
      currency: data.currency as Currency,
      availableTickets: data.availableTickets
        ? Number(data.availableTickets)
        : undefined,
    };
  }

  /**
   * Deletes the event metadata hash entirely.
   *
   * @param eventId The event ID
   */
  async deleteEventMeta(eventId: string): Promise<void> {
    await this.client.del(this.getEventMetaKey(eventId));

    this.logger.assign({
      messages: [`Event meta deleted for event ${eventId}`],
    });
  }

  // ─── Hold Keys (managed by AvailabilityService Lua scripts) ─────

  /**
   * Set a hold key for a booking (used by AvailabilityService via Lua).
   * This is also callable directly for fallback scenarios.
   *
   * @param bookingId The booking ID
   * @param quantity Number of tickets held
   * @param ttlMs TTL in milliseconds
   */
  async setHoldKey(
    bookingId: string,
    quantity: number,
    ttlMs: number,
  ): Promise<void> {
    await this.client.set(this.getHoldKey(bookingId), quantity, 'PX', ttlMs);

    this.logger.assign({
      messages: [`Hold key set for booking ${bookingId}`],
    });
  }

  /**
   * Delete the hold key for a booking (called after confirm or expire).
   *
   * @param bookingId The booking ID
   */
  async deleteHoldKey(bookingId: string): Promise<void> {
    await this.client.del(this.getHoldKey(bookingId));

    this.logger.assign({
      messages: [`Hold key deleted for booking ${bookingId}`],
    });
  }

  /**
   * Check if a booking hold is still active in Redis.
   *
   * @param bookingId The booking ID
   * @returns True if hold key exists (booking not yet expired in Redis)
   */
  async isHoldActive(bookingId: string): Promise<boolean> {
    const result = await this.client.exists(this.getHoldKey(bookingId));
    return result === 1;
  }

  // ─── Idempotency ────────────────────────────────────────────────

  /**
   * Store idempotency key to prevent dual-processing.
   *
   * @param key The unique idempotency key
   * @param value Stringified stored value payload
   */
  async setIdempotencyKey(key: string, value: string): Promise<void> {
    const rKey = this.getIdempotencyKeyStr(key);
    await this.client.set(rKey, value, 'PX', this.redisConfig.idempotencyTtl);

    this.logger.assign({
      messages: [`Idempotency key set for key ${key}`],
    });
  }

  /**
   * Retrieve cached idempotency key value.
   *
   * @param key The idempotency key
   * @returns String value or null if expired
   */
  async getIdempotencyKey(key: string): Promise<string | null> {
    return this.client.get(this.getIdempotencyKeyStr(key));
  }

  // ─── Webhook / Distributed Locks ────────────────────────────────

  /**
   * Acquire a distributed lock (Mutex) for safe parallel event consumption.
   *
   * @param key The lock key (e.g. bookingId)
   * @returns True if lock was acquired, false if collision
   */
  async acquireLock(key: string): Promise<boolean> {
    const result = await this.client.set(
      this.getWebhookLockKey(key),
      'LOCKED',
      'PX',
      5000,
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
    await this.client.del(this.getWebhookLockKey(key));
    this.logger.assign({
      messages: [`Lock released for key ${key}`],
    });
  }
}
