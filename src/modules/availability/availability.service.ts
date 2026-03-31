import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CachingService } from '../../core/caching';
import { TicketConfig } from '../../core/config/configurations/ticket.config';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums';
import { Model, Types } from 'mongoose';
import { CachingKeys } from './availability.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Event } from '../event/schemas/event.schema';

@Injectable()
export class AvailabilityService {
  private readonly checkAndHoldScript: string;
  private readonly releaseHoldScript: string;

  constructor(
    private readonly cachingService: CachingService,
    private readonly ticketConfig: TicketConfig,
    private readonly logger: LoggingService,
    @InjectModel(Event.name)
    private readonly eventModel: Model<Event>,
  ) {
    this.checkAndHoldScript = readFileSync(
      join(__dirname, 'lua', 'check-and-hold.lua'),
      'utf8',
    );

    this.releaseHoldScript = readFileSync(
      join(__dirname, 'lua', 'release-hold.lua'),
      'utf8',
    );
  }

  // ─── Key Helpers ────────────────────────────────────────────────

  private getEventSlotsKey(eventId: any): string {
    return CachingKeys.EVENT_SLOTS.replace('*', String(eventId));
  }

  private getHoldKey(bookingId: any): string {
    return CachingKeys.HOLD.replace('*', String(bookingId));
  }

  getEventMetaKey(eventId: any): string {
    return CachingKeys.EVENT_META.replace('*', String(eventId));
  }

  getIdempotencyKeyStr(key: any): string {
    return CachingKeys.IDEMPOTENCY.replace('*', String(key));
  }

  getWebhookLockKey(bookingId: any): string {
    return CachingKeys.BOOKING_LOCK.replace('*', String(bookingId));
  }

  // ─── Slot Management ────────────────────────────────────────────

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
      await this.cachingService.setEx(key, quantity, ttlSeconds);
    } else {
      await this.cachingService.set(key, quantity);
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
  async deleteEventSlots(eventId: Types.ObjectId): Promise<void> {
    await this.cachingService.del(this.getEventSlotsKey(eventId.toString()));
  }

  /**
   * Get available slots for an event.
   *
   * @param eventId The event ID
   * @returns Number of available slots
   */
  async availableSlotsCount(eventId: string): Promise<number> {
    const slotsKey = this.getEventSlotsKey(eventId);

    const availableSlotsCached = await this.cachingService.get(slotsKey);

    if (availableSlotsCached !== null) {
      return Number(availableSlotsCached);
    } else {
      this.logger.assign({
        messages: [`cache miss for event ${eventId}`],
      });
    }

    const event = await this.eventModel.findById(eventId);

    if (!event) {
      this.logger.assign({
        messages: [`Event ${eventId} not found in DB`],
      });
      throw new BadRequestException(`Event not found`);
    }

    this.logger.assign({
      messages: [
        `DB Hit - Available slots for event ${eventId}: ${event.availableTickets}.`,
      ],
    });

    await this.setEventSlots(
      eventId,
      Number(event.availableTickets),
      event.date,
    );

    this.logger.assign({
      messages: [`Cache SET - Slots set for event ${eventId}.`],
    });

    return Number(event.availableTickets);
  }

  /**
   * Atomically checks availability and places a hold for the given quantity.
   * Throws BadRequestException if slots are insufficient.
   *
   * @param eventId The event ID
   * @param bookingId The booking ID (used as hold marker key)
   * @param quantity Number of tickets requested
   * @returns Remaining slot count after hold
   * @throws BadRequestException if not enough slots
   */
  async checkAndHold(
    eventId: string,
    bookingId: string,
    quantity: number,
  ): Promise<number> {
    const slotsKey = this.getEventSlotsKey(eventId);
    const holdKey = this.getHoldKey(bookingId);
    const ttlMs = this.ticketConfig.ticketHoldingTtl;

    const result = (await this.cachingService.eval(
      this.checkAndHoldScript,
      2,
      slotsKey,
      holdKey,
      String(quantity),
      String(ttlMs),
    )) as number;

    this.logger.assign({
      action: LogAction.CHECK_AVAILABILITY,
      messages: [
        `checkAndHold: eventId=${eventId} bookingId=${bookingId} qty=${quantity} success=${result === -1 ? false : true}`,
      ],
    });

    if (result === -1) {
      throw new BadRequestException(
        `Not enough tickets available for event ${eventId}`,
      );
    }

    return result;
  }

  /**
   * Atomically releases a booking hold and restores slots to the pool.
   * Idempotent — safe to call even if hold is already gone.
   *
   * @param eventId The event ID
   * @param bookingId The booking ID
   * @param quantity Number of tickets to release back
   * @returns 1 if hold existed and was deleted, 0 if already gone
   */
  async releaseHold(
    eventId: string,
    bookingId: string,
    quantity: number,
  ): Promise<number> {
    const slotsKey = this.getEventSlotsKey(eventId);
    const holdKey = this.getHoldKey(bookingId);

    const result = (await this.cachingService.eval(
      this.releaseHoldScript,
      2,
      slotsKey,
      holdKey,
      String(quantity),
    )) as number;

    this.logger.assign({
      action: LogAction.RELEASE_HOLD,
      messages: [
        `releaseHold: eventId=${eventId} bookingId=${bookingId} qty=${quantity} deleted=${result}`,
      ],
    });

    return result;
  }

  /**
   * Check if a hold is still active in Redis (fast path slot check).
   *
   * @param bookingId The booking ID
   * @returns True if hold key exists
   */
  async isHoldActive(bookingId: string): Promise<boolean> {
    return this.cachingService.exists(this.getHoldKey(bookingId));
  }
}
