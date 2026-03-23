# Redis Sub-module

Provides a global `ioredis` client for distributed locking and caching.

## Responsibilities

- **Provider**: Creates an `ioredis` client configured from `ConfigService` (host, port, password).
- **Retry strategy**: Exponential backoff capped at 5 seconds.
- **Global**: The `REDIS_CLIENT` token is available for injection across all modules.

## Usage

```typescript
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../core/redis/index.js';

@Injectable()
export class TicketingService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquireLock(ticketId: string, userId: string): Promise<boolean> {
    const result = await this.redis.set(
      `lock:ticket:${ticketId}`,
      userId,
      'EX', 600,
      'NX',
    );
    return result === 'OK';
  }
}
```
