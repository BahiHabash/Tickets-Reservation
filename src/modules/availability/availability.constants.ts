export enum CachingKeys {
  /* Available tickets for an event */
  EVENT_SLOTS = 'event:*:slots',
  /* Info for an event */
  EVENT_META = 'event:*:meta',
  /* Idempotency keys for preventing duplicate requests */
  IDEMPOTENCY = 'idem:*',
  /* Booking locks to prevent race conditions */
  BOOKING_LOCK = 'booking:*:lock',
  /* Holds for reserved but not confirmed bookings */
  HOLD = 'hold:*',
}
