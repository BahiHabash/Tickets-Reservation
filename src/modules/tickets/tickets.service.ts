import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Ticket, TicketDocument } from './schemas/ticket.schema';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Generates one Ticket document per seat requested.
   * Each ticket receives a cryptographically random unique code.
   *
   * @param bookingId The parent booking ID
   * @param eventId The event ID the tickets belong to
   * @param userId The user who owns the tickets
   * @param quantity Number of tickets to generate
   * @returns Array of created Ticket documents
   */
  async generateTickets(
    bookingId: string,
    eventId: string,
    userId: string,
    quantity: number,
  ): Promise<TicketDocument[]> {
    const tickets = Array.from({ length: quantity }, () => ({
      booking: new Types.ObjectId(bookingId),
      event: new Types.ObjectId(eventId),
      user: new Types.ObjectId(userId),
      ticketCode: `TKT-${randomBytes(8).toString('hex').toUpperCase()}`,
      isValid: true,
    }));

    let created: TicketDocument[];
    try {
      created = await this.ticketModel.insertMany(tickets);
    } catch (error) {
      this.logger.assign({
        action: LogAction.GET_MY_TICKETS,
        messages: [
          `Failed to generate tickets for bookingId=${bookingId} eventId=${eventId}`,
        ],
      });
      throw error;
    }

    this.logger.assign({
      action: LogAction.GET_MY_TICKETS,
      messages: [
        `Generated ${quantity} ticket(s) for bookingId=${bookingId} eventId=${eventId}`,
      ],
    });

    return created;
  }

  /**
   * Invalidates all tickets belonging to a booking (sets isValid = false).
   * Used when a booking expires or is canceled.
   *
   * @param bookingId The booking whose tickets should be invalidated
   * @returns Number of documents modified
   */
  async invalidateByBooking(bookingId: string): Promise<number> {
    const result = await this.ticketModel.updateMany(
      { booking: new Types.ObjectId(bookingId) },
      { $set: { isValid: false } },
    );

    this.logger.assign({
      messages: [
        `Invalidated tickets for bookingId=${bookingId} — modified: ${result.modifiedCount}`,
      ],
    });

    return result.modifiedCount;
  }

  /**
   * Invalidates all tickets for all bookings of a given event.
   * Called when an event is canceled.
   *
   * @param eventId The canceled event ID
   * @returns Number of documents modified
   */
  async invalidateByEvent(eventId: string): Promise<number> {
    const result = await this.ticketModel.updateMany(
      { event: new Types.ObjectId(eventId) },
      { $set: { isValid: false } },
    );

    this.logger.assign({
      messages: [
        `Invalidated all tickets for eventId=${eventId} — modified: ${result.modifiedCount}`,
      ],
    });

    return result.modifiedCount;
  }

  /**
   * Retrieve all valid tickets for the authenticated user.
   *
   * @param userId The user ID
   * @returns Array of valid ticket documents (populated with event and booking refs)
   */
  async getUserTickets(userId: string): Promise<TicketDocument[]> {
    const tickets: TicketDocument[] =
      (await this.ticketModel
        .find({ user: new Types.ObjectId(userId), isValid: true })
        .populate('event', 'title date')
        .populate('booking', 'status quantity')
        .exec()) || [];

    return tickets;
  }
}
