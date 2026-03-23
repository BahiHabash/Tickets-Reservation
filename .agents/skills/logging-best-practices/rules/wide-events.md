# Rule: Wide Events / Canonical Log Lines

**Impact: CRITICAL**

## Description

Instead of scattered logs throughout a request, consolidate all relevant information into a **single, comprehensive event** emitted at the very end of processing.

## Best Practices

- **Consolidate**: Avoid logging separate lines for "Request received", "DB queried", "Result found". Instead, build a context object and log it once.
- **Outcome Focused**: The wide event should describe the final outcome (success/failure) and the total time taken.
- **Traceability**: Ensure every wide event has a `traceId` or `requestId` to link it across distributed services.

## Example (Anti-pattern)

```typescript
// DON'T DO THIS
this.logger.log('Starting reservation for ticket TKT-123');
// ... logic
this.logger.log('Payment successful for user usr_44');
// ... logic
this.logger.log('Reservation completed in 45ms');
```

## Example (Best Practice)

```typescript
// DO THIS
this.logger.assign({
  action: LogAction.TICKET_RESERVED,
  user: { id: 'usr_44' },
  messages: ['Starting reservation', 'Payment successful'],
  metadata: { ticketId: 'TKT-123' },
});
```
