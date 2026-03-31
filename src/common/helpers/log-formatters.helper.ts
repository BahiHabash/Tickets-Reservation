import { User } from '../../modules/user/schemas/user.schema';
import { LoggingPayload } from '../../core/logging/interfaces/logging-payload.interface';
import { EventDocument } from '../../modules/event/schemas/event.schema';
import { BookingDocument } from '../../modules/booking/schemas/booking.schema';
import { TicketDocument } from '../../modules/tickets/schemas/ticket.schema';
import { PaymentDocument } from '../../modules/payments/schemas/payment.schema';
import type { Payload } from '../interfaces/auth-token.interface';

/**
 * Common logging formatters to transform distinct system entities into the canonical Logging log shapes.
 */

export function formatUserLog(
  user: Payload | Partial<User>,
): LoggingPayload['user'] {
  // if the user is an instance of User document
  if (user instanceof User) {
    return {
      id: String(user._id || user.id),
      email: user.email,
      role: user.role,
    };
  }

  // if the user is an auth payload
  if (typeof user === 'object' && 'sub' in user) {
    return {
      id: String(user.sub),
      email: user.email,
      role: user.role,
    };
  }

  return undefined;
}

export function formatEventLog(
  event: Partial<EventDocument>,
): LoggingPayload['event'] {
  if (!event) return undefined;

  return {
    id: String(event._id || event.id),
    title: event.title,
    date:
      event.date instanceof Date
        ? event.date.toISOString()
        : String(event.date),
    price: event.price,
    capacity: event.capacity,
    availableTickets: event.availableTickets,
    status: event.status,
    currency: event.currency,
  };
}

export function formatBookingLog(
  booking: Partial<BookingDocument>,
): LoggingPayload['booking'] {
  if (!booking) return undefined;

  return {
    id: String(booking._id || booking.id),
    status: booking.status,
    expiresAt:
      booking.expiresAt instanceof Date
        ? booking.expiresAt.toISOString()
        : String(booking.expiresAt),
    amountTotal: booking.amountTotal,
    quantity: booking.quantity,
  };
}

export function formatTicketLog(
  ticket: Partial<TicketDocument>,
): LoggingPayload['ticket'] {
  if (!ticket) return undefined;

  return {
    id: String(ticket._id || ticket.id),
    code: ticket.code,
    status: ticket.status,
  };
}

export function formatPaymentLog(
  payment: Partial<PaymentDocument>,
): LoggingPayload['payment'] {
  if (!payment) return undefined;

  return {
    id: String(payment.id || payment._id),
    amount: payment.amount,
    currency: payment.currency,
    method: payment.paymentMethod,
    transactionId: payment.transactionId,
    paidAt: payment.paidAt,
  };
}
