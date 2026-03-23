# Logger Sub-module

Implements structured **Wide-Event** logging persisted to MongoDB.

## Responsibilities

- **`WideEventLog` schema**: Mongoose model stored in the `logs` collection with fields for `traceId`, `level`, `action`, `userId`, `eventId`, `ticketId`, `durationMs`, `message`, and extensible `metadata`.
- **`WideEventLoggerService`**: Implements NestJS `LoggerService`. Every log is written to MongoDB as a structured Wide Event (fire-and-forget) and printed to stdout/stderr.

## Usage

### Standard NestJS logging (context only)
```typescript
this.logger.log('Application started', 'Bootstrap');
```

### Structured Wide-Event logging (with payload)
```typescript
this.logger.warn(
  'Seat reservation denied - Redis lock already held',
  {
    action: 'ACQUIRE_LOCK_FAILED',
    userId: 'usr_998',
    eventId: 'evt_55',
    ticketId: 'TKT-55-12',
    durationMs: 42,
  },
  'TicketingService',
);
```

## ⚠️ Mandatory Usage

The `WideEventLoggerService` is the **exclusive** logging mechanism for this project.

- Do NOT use `console.log` or the default NestJS `Logger`.
- Mandatory for: Error handling, Payment flows, Inventory changes, and performance timing.
- All logs are queryable in MongoDB for production audit trails.

