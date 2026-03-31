import { Module, Global } from '@nestjs/common';
import { cachingProvider } from './caching.provider';
import { CACHING_CLIENT } from './caching.constants';
import { CachingService } from './caching.service';
import { DistributedLockService } from './distributed-lock.service';

@Global()
@Module({
  providers: [cachingProvider, CachingService, DistributedLockService],
  exports: [CACHING_CLIENT, CachingService, DistributedLockService],
})
export class CachingModule {}
