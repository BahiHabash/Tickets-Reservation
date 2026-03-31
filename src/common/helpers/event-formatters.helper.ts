import type { Event } from '../../modules/event/schemas/event.schema';
import type { EventMeta } from '../interfaces';

export function formatEventMeta(event: Event): EventMeta {
  return {
    title: event.title,
    price: event.price,
    currency: event.currency,
    date: event.date,
    status: event.status,
    capacity: event.capacity,
  };
}
