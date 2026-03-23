# Core Module

The infrastructure foundation of the Ticket Reservation Engine. Single import point for `AppModule`.

## Sub-modules

| Sub-module | Purpose | Global? |
|------------|---------|---------|
| **Config** | Environment variable validation & namespaced configs | ✅ |
| **Database** | MongoDB/Mongoose connection + `AbstractRepository` DAL | ❌ |
| **Redis** | `ioredis` client via `REDIS_CLIENT` injection token | ✅ |
| **Logger** | Wide-Event structured logs persisted to MongoDB `logs` | ✅ |

> [!IMPORTANT]
> `CoreModule` is the **mandatory entry point** for all infrastructure concerns. Never bypass it by manually importing underlying core services.

## Also includes

- `@nestjs/event-emitter` — for decoupled domain events (e.g., `payment.success`, `payment.failed`).
