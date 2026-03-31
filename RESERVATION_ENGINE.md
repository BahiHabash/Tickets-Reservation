# Ticket Reservation Engine: Architecture & Technical Spec

## Overview
A high-concurrency ticket reservation system designed to handle thousands of requests per second during "hot sales" events. The engine implements a multi-layered approach to ensure data consistency, high availability, and zero ticket over-selling.

---

## Core Features & Techniques

### 1. High-Performance Caching (Redis)
- **Hot Data Storage**: Event metadata (price, currency, basic info) is cached in Redis to avoid hitting MongoDB for every request.
- **Availability Tracking**: Ticket counts are stored as atomic integers in Redis.
- **Fast Path Checks**: Before any database interaction, availability is verified against the Redis cache.

### 2. Concurrency Control & Race Condition Mitigation
- **Redis Multi-Locks**: Distributed locks are acquired using a unique key (e.g., `booking:creating:{idempotencyKey}`) to prevent duplicate processing of the same request.
- **Atomic Operations (Lua Scripting)**: Decrementing ticket capacity is handled via server-side Lua scripts in Redis. This ensures that the check-and-reserve operation is completely atomic.
  - *Scenario*: Two users attempt to buy the last ticket simultaneously.
  - *Handling*: The Lua script guarantees only one caller succeeds in decrementing the counter, even in a distributed environment.

### 3. Comprehensive Idempotency Strategy
- **Layered Validation**:
  - **Redis Layer**: Fast lookup of previous results using the idempotency key.
  - **Persistence Layer**: Unique constraints in MongoDB serve as the final source of truth.
- **Consistency**: Prevents duplicate charges and over-booking if a client retries due to network failure.

### 4. Data Consistency (Mongoose Transactions)
- **ACID Transactions**: Critical operations (Booking → Confirmed + Ticket Generation + Capacity Update) are wrapped in Mongoose sessions/transactions.
- **Rollback Capability**: If any step in the complex confirmation process fails (e.g., database network blip during ticket generation), the entire transaction is rolled back, and the ticket inventory is safely released.

### 5. Automated Reliability (BullMQ)
- **Expiration Management**: Upon reservation (PENDING status), a delayed job is dispatched to BullMQ.
- **Slot Recovery**: If the user fails to complete payment within the TTL (e.g., 10 minutes), the background worker automatically marks the booking as EXPIRED and releases the tickets back to the pool.

---

## Technical Challenges & Solutions

| Challenge | Scenario | Handling Technique |
| :--- | :--- | :--- |
| **Over-selling** | 1000 users competing for 1 last ticket. | **Atomic Lua Scripting** (Redis) ensures absolute zero over-sell. |
| **Duplicate Payments** | Client retries payment request due to timeout. | **Idempotency Keys** (Mongo + Redis) block duplicate processing. |
| **Inconsistent State** | Server crashes after payment but before ticket generation. | **Mongoose Transactions** + **Websocket/Webhook Handlers** for eventual consistency. |
| **Ghost Reservations** | User reserves tickets but closes browser. | **BullMQ Delayed Jobs** (TTL based) ensure slots are never stuck. |
| **High Latency** | DB bottlenecks during peak traffic. | **Read-Through Caching** for metadata and **Redis-First** availability checks. |

---

## System Workflow (The Hot Path)
1. **Request Received**: Validate DTO and sanitize inputs.
2. **Idempotency Hit?**: Check Redis; if exists, return previous response.
3. **Acquire Lock**: Secure a 5-10s lock on the idempotency key.
4. **Availability Check**: Query Redis; if `available < quantity`, reject immediately.
5. **Atomic Hold**: Execute Lua script to decrement Redis counter.
6. **Persistence**: Create `PENDING` booking in MongoDB.
7. **Schedule Expiry**: Dispatch BullMQ delayed job.
8. **Release Lock**: Allow subsequent (different) requests to proceed.
