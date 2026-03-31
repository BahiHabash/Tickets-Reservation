import type { EventStatus } from '../../modules/event/enums/event-status.enum';
import { Currency } from '../enums/money-currency.enum';

/**
 * Cached event metadata stored as a Redis Hash.
 * Represents a snapshot of event data used in the booking hot path.
 */
export interface EventMeta extends Partial<Event> {
  title: string;
  price: number;
  currency: Currency;
  date: Date;
  status: EventStatus;
  capacity: number;
  availableTickets?: number;
}
