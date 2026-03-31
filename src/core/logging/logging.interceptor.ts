import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { LoggingService, type LoggingContext } from './logging.service';
import { LogLevel } from '../../common/enums/logs.enum';
import type { Response } from 'express';
import { AppConfig } from '../config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggingService,
    private readonly appConfig: AppConfig,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res: Response = ctx.getResponse();
    const startTime = process.hrtime();

    const store = this.logger.getStore();
    if (!store) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = res;
        this.logger.assign({
          statusCode,
          outcome: statusCode >= 400 ? 'error' : 'success',
        });
      }),
      catchError((error) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const err = error as Error;
        this.logger.assign({
          statusCode: status,
          outcome: 'error',
          level: LogLevel.ERROR,
          error: {
            type: err.name,
            message: [err.message],
            stack: err.stack,
          },
        });
        return throwError(() => err);
      }),
      finalize(() => {
        const diff = process.hrtime(startTime);
        const durationMs = Math.round(diff[0] * 1000 + diff[1] / 1e6);
        this.logger.assign({ durationMs });

        if (this.shouldLog(store)) {
          // Fire and forget persistence to background, handle catch if any
          this.logger.persist(store).catch(() => {});
          // this.logger.logEvent(store);
        }
      }),
    );
  }

  private shouldLog(store: LoggingContext): boolean {
    const { payload, level } = store;
    const { statusCode, durationMs } = payload;

    // 1. Always keep errors: 100% of 500s, exceptions, and failures
    if (
      level === LogLevel.ERROR ||
      level === LogLevel.FATAL ||
      (statusCode && statusCode >= 500)
    ) {
      return true;
    }

    // 2. Always keep slow requests: Anything above p99 threshold (arbitrary 1000ms for now)
    const P99_THRESHOLD_MS = this.appConfig.logP99ThresholdMs;
    if (durationMs && durationMs > P99_THRESHOLD_MS) {
      return true;
    }

    // 3. Always keep specific users (VIP, internal, flagged sessions)
    if (payload.isVip || payload.isInternal) {
      return true;
    }

    // 4. Randomly sample the rest: Happy, fast requests? Keep 3%
    const SAMPLING_RATE = this.appConfig.logSamplingRate;
    return Math.random() < SAMPLING_RATE;
  }
}
