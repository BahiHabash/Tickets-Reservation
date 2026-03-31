import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Booking } from './schemas/booking.schema';
import { Ticket } from './schemas/ticket.schema';
import { Event } from '../event/schemas/event.schema';
import { BookingStatus } from './enums/booking-status.enum';
import { LoggingService } from '../../core/logging';
import { TicketConfig } from '../../core/config/configurations/ticket.config';
import { CachingService } from '../../core/caching';
import { formatBookingLog } from '../../common/helpers';
import { EventStorageService } from '../availability/event.storage';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<Ticket>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectQueue('booking-expiry') private readonly expiryQueue: Queue,
    @InjectConnection() private readonly connection: Connection,
    private readonly cachingService: CachingService,
    private readonly ticketConfig: TicketConfig,
    private readonly availabilityService: AvailabilityService,
    private readonly logger: LoggingService,
    private readonly eventStorage: EventStorageService,
  ) {}

  /**
   * The Hot Path — Atomic Redis DECR to lock inventory, then create Booking.
   */
  async createBooking(
    userId: Types.ObjectId,
    eventId: Types.ObjectId,
    quantity: number,
    idempotencyKey: string,
  ): Promise<Booking> {
    // 1. Idempotency check via Redis (Fast path)
    const cachedBooking = await this.cachingService.hgetall(
      this.availabilityService.getIdempotencyKeyStr(idempotencyKey),
    );

    if (Object.keys(cachedBooking).length) {
      this.logger.assign({
        messages: [
          `Idempotent hit (Redis) — returning existing booking ${cachedBooking._id as unknown as string}`,
        ],
        booking: formatBookingLog(cachedBooking),
      });

      throw new ConflictException('Booking already exists');
    }

    this.logger.assign({
      messages: ['No idempotent hit, proceeding with booking creation.'],
    });

    // 2. Lock creation to prevent race conditions
    const creationLockKey = `booking:creating:${idempotencyKey}`;
    const locked = await this.cachingService.acquireLock(
      creationLockKey,
      10000,
    ); // 10s lock

    if (!locked) {
      this.logger.assign({
        messages: [
          `Concurrent booking request detected for key ${idempotencyKey} — rejecting as conflict.`,
        ],
      });
      throw new ConflictException(
        'A booking is already being processed for this request.',
      );
    }

    this.logger.assign({
      messages: ['Lock acquired, proceeding with booking creation.'],
    });

    try {
      // Fallback: Check MongoDB
      const existingBooking = await this.bookingModel
        .findOne({ idempotencyKey })
        .exec();

      if (existingBooking) {
        this.logger.assign({
          messages: [
            `Idempotent hit (Mongo) — returning existing booking ${String(existingBooking._id)}`,
          ],
          booking: formatBookingLog(existingBooking),
        });
        throw new ConflictException('Booking already exists');
      }

      this.logger.assign({
        messages: [
          'No idempotent hit in MongoDB, proceeding with booking creation.',
        ],
      });

      const event = await this.eventStorage.getEvent(eventId);

      if (event === null) {
        this.logger.assign({
          messages: [`create bookig - Event Not Found.`],
        });

        throw new NotFoundException('Event Not Found.');
      }

      this.logger.assign({
        messages: ['Event found, proceeding with booking creation.'],
      });

      const eventDate = new Date(event.date);
      if (eventDate < new Date()) {
        this.logger.assign({
          messages: ['Event has already ended'],
        });
        throw new ConflictException('Event has already ended');
      }

      // Atomic Redis Reservation
      this.logger.assign({
        messages: [`Attempting to reserve ${quantity} tickets.`],
      });

      const availableSlots = await this.availabilityService.availableSlotsCount(
        String(eventId),
      );

      if (availableSlots < quantity) {
        this.logger.assign({
          messages: [
            `Not enough tickets available, ${availableSlots} available, ${quantity} requested.`,
          ],
        });

        throw new BadRequestException(
          `${availableSlots ? 'No Enough Tickets' : 'Tickets are sold out'}.`,
        );
      }

      // Create Booking document (PENDING)
      let booking: Booking;

      try {
        booking = await this.bookingModel.create({
          user: userId,
          event: eventId,
          quantity,
          status: BookingStatus.PENDING,
          idempotencyKey,
          expiresAt: this.calcBookingExpiresAt(),
          amountTotal: this.calcTotalAmount(Number(event.price), quantity),
          currency: event.currency,
        });
      } catch (error) {
        this.logger.assign({
          messages: ['Booking creation failed in MongoDB', String(error)],
        });
        throw error;
      }

      // hold the tickets
      await this.availabilityService.checkAndHold(
        String(eventId),
        booking._id.toString(),
        quantity,
      );

      // Store in Redis idempotency cache
      await this.cachingService.setEx(
        `idempotency:${idempotencyKey}`,
        JSON.stringify(booking.toJSON()),
        this.ticketConfig.ticketHoldingTtl, // 24 hours
      );

      // 5. Dispatch delayed BullMQ job for expiry
      await this.expiryQueue.add(
        'expire-booking',
        { bookingId: booking._id.toString() },
        { delay: this.ticketConfig.ticketHoldingTtl, removeOnComplete: true },
      );

      this.logger.assign({
        booking: formatBookingLog(booking),
        messages: [
          `Booking created — expiry job dispatched (${this.ticketConfig.ticketHoldingTtl}ms delay)`,
        ],
      });

      return booking;
    } finally {
      await this.cachingService.releaseLock(creationLockKey);
    }
  }

  /**
   * Called by payment.success event listener.
   * Transitions Booking → CONFIRMED and generates Ticket documents.
   */
  async confirmBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingModel
      .findOne({ _id: bookingId })
      .populate('event', 'title price date currency capacity')
      .exec();

    if (!booking) {
      this.logger.assign({
        messages: [
          `Booking ${bookingId} not found or not in PENDING state — skipping confirm`,
        ],
      });
      return;
    }

    if (booking.status !== BookingStatus.PENDING) {
      this.logger.assign({
        messages: [
          `Booking ${bookingId} not in PENDING state — skipping confirm`,
        ],
      });
      return;
    }

    // Generate actual Ticket documents
    const tickets: Partial<Ticket>[] = [];
    for (let i = 0; i < booking.quantity; i++) {
      tickets.push({
        booking: booking._id,
        event: booking.event,
        user: booking.user,
        ticketCode: `TKT-${booking.event.toString()}-${booking._id.toString()}-${i + 1}`,
        isValid: true,
      });
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      await Promise.all([
        // create tickets
        this.ticketModel.insertMany(tickets),

        // update booking status
        this.bookingModel
          .updateOne({ _id: bookingId }, { status: BookingStatus.CONFIRMED })
          .exec(),

        // Update Event.availableTickets in MongoDB (for display purposes)
        this.eventModel
          .updateOne(
            { _id: booking.event },
            { $inc: { availableTickets: -booking.quantity } },
          )
          .exec(),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      this.logger.assign({
        messages: ['Database transaction aborted due to error', String(error)],
      });
      throw new InternalServerErrorException(
        'Failed to confirm booking securely.',
      );
    } finally {
      await session.endSession();
    }

    this.logger.assign({
      booking: { id: bookingId, status: BookingStatus.CONFIRMED },
      messages: [`Booking confirmed — ${booking.quantity} ticket(s) generated`],
    });
  }

  /**
   * Called by BullMQ expiry processor.
   * If still PENDING → EXPIRED, release Redis slots.
   */
  async expireBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingModel
      .findOneAndUpdate(
        { _id: bookingId, status: BookingStatus.PENDING },
        { status: BookingStatus.EXPIRED },
        { new: true },
      )
      .exec();

    if (!booking) {
      this.logger.assign({
        messages: [`Booking ${bookingId} already processed — skipping expiry`],
      });
      return;
    }

    // Release capacity back
    await this.availabilityService.releaseHold(
      booking.event.toString(),
      booking._id.toString(),
      booking.quantity,
    );

    this.logger.assign({
      booking: formatBookingLog(booking),
      messages: [
        `Booking expired — ${booking.quantity} slot(s) released back to Redis`,
      ],
    });
  }

  /**
   * Called by payment.failed event listener.
   * Transitions Booking → FAILED, release Redis slots.
   */
  async failBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingModel
      .findOneAndUpdate(
        { _id: bookingId, status: BookingStatus.PENDING },
        { status: BookingStatus.FAILED },
        { new: true },
      )
      .exec();

    if (!booking) {
      this.logger.assign({
        messages: [`Booking ${bookingId} not in PENDING state — skipping fail`],
      });
      return;
    }

    // Release capacity back
    await this.availabilityService.releaseHold(
      booking.event.toString(),
      booking._id.toString(),
      booking.quantity,
    );

    this.logger.assign({
      booking: { id: bookingId, status: BookingStatus.FAILED },
      messages: [
        `Booking failed — ${booking.quantity} slot(s) released back to Redis`,
      ],
    });
  }

  /**
   * Admin or user cancels a CONFIRMED booking.
   * Invalidates tickets, releases Redis inventory safely using a transaction.
   */
  async cancelBooking(bookingId: string, _userId: string): Promise<void> {
    const booking: Booking | null = await this.bookingModel
      .findById(bookingId)
      .exec();

    if (!booking) {
      this.logger.assign({
        messages: [`Booking ${bookingId} not found — skipping cancel`],
      });
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const bookingLogs = formatBookingLog(booking);

    if (booking.status === BookingStatus.CANCELLED) {
      this.logger.assign({
        booking: bookingLogs,
        messages: [`Booking already cancelled — skipping`],
      });
      throw new BadRequestException(`Booking already cancelled`);
    }

    if (booking.user.toString() !== _userId) {
      this.logger.assign({
        booking: bookingLogs,
        messages: [`Booking not owned by user ${_userId} — skipping cancel`],
      });
      throw new UnauthorizedException(`Booking not owned by user ${_userId}`);
    }

    // 2. Start the MongoDB Session & Transaction
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      // Step A: Mark the booking itself as cancelled
      booking.status = BookingStatus.CANCELLED;
      await booking.save({ session });

      // Step B: Invalidate tickets and increment event capacity concurrently
      await Promise.all([
        this.ticketModel
          .updateMany({ booking: booking._id }, { isValid: false }, { session })
          .exec(),

        this.eventModel
          .updateOne(
            { _id: booking.event },
            { $inc: { availableTickets: booking.quantity } },
            { session },
          )
          .exec(),
      ]);

      // 3. Commit the Transaction (Saves all MongoDB changes atomically)
      await session.commitTransaction();

      this.logger.assign({
        messages: [
          `Booking ${bookingId} cancelled — ${booking.quantity} tickets invalidated - DataBase`,
        ],
      });
    } catch (error) {
      // 4. Rollback all MongoDB changes if ANY step fails
      await session.abortTransaction();
      this.logger.assign({
        messages: ['Database transaction aborted due to error', String(error)],
      });
      throw new InternalServerErrorException(
        'Failed to cancel booking securely.',
      );
    } finally {
      // 5. Always end the session to prevent memory leaks
      await session.endSession();
    }

    // 6. Release capacity back to Redis (Only happens if Mongo transaction succeeds)
    // Note: Adjust the method name depending on if you used RedisService or TicketCacheService
    await this.availabilityService.releaseHold(
      booking.event.toString(),
      booking._id.toString(),
      booking.quantity,
    );

    this.logger.assign({
      booking: {
        ...bookingLogs,
        status: BookingStatus.CANCELLED,
      },
      messages: [
        `Booking cancelled — ${booking.quantity} slot(s) released, tickets invalidated`,
      ],
    });
  }

  /**
   * Fetch all bookings for a specific user.
   */
  async getUserBookings(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Handle payment success event.
   * @param payload Payment success event payload.
   * @returns Promise<void>
   */
  async handlePaymentSuccess(payload: { bookingId: string }): Promise<void> {
    const locked = await this.cachingService.acquireLock(payload.bookingId);
    if (!locked) {
      this.logger.assign({
        messages: [
          `Webhook lock busy for booking ${payload.bookingId} — ignoring duplicate event based on REDIS lock.`,
        ],
      });
      return;
    }

    try {
      this.logger.assign({
        messages: ['Payment success event received — confirming booking'],
      });

      await this.confirmBooking(payload.bookingId);
    } finally {
      await this.cachingService.releaseLock(payload.bookingId);
    }
  }

  async handlePaymentFailed(payload: { bookingId: string }): Promise<void> {
    const locked = await this.cachingService.acquireLock(payload.bookingId);
    if (!locked) {
      this.logger.assign({
        messages: [
          `Webhook lock busy for booking ${payload.bookingId} — ignoring duplicate event based on REDIS lock.`,
        ],
      });
      return;
    }

    try {
      this.logger.assign({
        messages: ['Payment failed event received — failing booking'],
      });

      await this.failBooking(payload.bookingId);
    } finally {
      await this.cachingService.releaseLock(payload.bookingId);
    }
  }

  /**
   * Get booking by ID.
   * @param bookingId Booking ID.
   * @returns Promise<Booking | null>
   */
  async getBookingById(bookingId: Types.ObjectId): Promise<Booking | null> {
    return this.bookingModel.findById(bookingId).exec();
  }

  /**
   * Calculate total amount.
   * @param price Price.
   * @param quantity Quantity.
   * @returns Promise<number>
   */
  calcTotalAmount(price: number, quantity: number): number {
    return price * quantity;
  }

  /**
   * Calculate booking expires at.
   * @returns Promise<Date>
   */
  calcBookingExpiresAt(): Date {
    return new Date(Date.now() + this.ticketConfig.ticketHoldingTtl);
  }
}
