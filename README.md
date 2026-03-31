# Tickets Reservation Engine

A professional high-performance NestJS-based backend for high-concurrency ticket booking and real-time inventory management.

## 🏗️ Architecture Overview

The project follows a modular architecture designed for scalability and maintainability:

- **`src/common`**: Project-wide utility types, decorators, and centralized enums (e.g., `NodeEnv`, `LogLevel`). Always use these shared constants.
- **`src/core`**: The infrastructure backbone. Managed by the `CoreModule`, it handles all non-business concerns (Config, DB, Redis, Logging).
- **`src/modules`**: (Under development) Will contain business-specific modules (Users, Events, Bookings, Payments).

## 🚀 Core Infrastructure

All infrastructure logic is encapsulated within the `CoreModule` and its specialized sub-modules:

| Sub-module   | Purpose                                                                | Global? |
| ------------ | ---------------------------------------------------------------------- | ------- |
| **Config**   | Robust environment validation (via Joi) and namespaced configurations. | ✅      |
| **Database** | Managed MongoDB connection and base abstract repositories for DAL.     | ❌      |
| **Redis**    | High-performance `ioredis` client for distributed locking and caching. | ✅      |
| **Logger**   | **Mandatory** structured Wide-Event logging system.                    | ✅      |

### Using Core Services

Since most core modules are global, you can inject their services directly into any provided class:

```typescript
constructor(private readonly appConfig: AppConfig) {}
```

## 📝 Logging Strategy

**Strict Requirement**: Every log in the system must use the `LoggingService` (exported via `LoggerModule`).

### Why?

Unlike default string-based loggers, this service persists **Structured Wide Events** to MongoDB. This enables complex auditing, performance tracking, and troubleshooting without manual log parsing.

### How to Use

Always inject `LoggingService` or use it as the default NestJS logger:

```typescript
// 1. Context logging (simulating standard logger)
this.logger.log('Payment processed', 'PaymentsService');

// 2. Structured logging (Mandatory for critical paths)
this.logger.warn(
  'Inventory threshold reached',
  {
    action: 'LOW_INVENTORY_DETECTED',
    eventId: 'evt_123',
    metadata: { stockLeft: 5 },
  },
  'InventoryService',
);
```

## 🛠️ Project Setup

### 1. Prerequisites

- Node.js v20.17+
- Docker & Docker Compose

### 2. Infrastructure

Spin up the required infrastructure (Redis) using Docker Compose:

```bash
docker-compose up -d
```

### 3. Installation

```bash
npm install
```

### 4. Running

```bash
# Development (with watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🧪 Verification

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📜 License

Unlicensed (Private Project)
