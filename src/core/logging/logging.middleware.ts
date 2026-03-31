import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService, LoggingContext } from './logging.service';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config';
import { LogLevel } from '../../common/enums/logs.enum';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggingService,
    private readonly appConfig: AppConfig,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const requestId =
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : Array.isArray(req.headers['x-request-id'])
          ? req.headers['x-request-id'][0]
          : undefined) || randomUUID();

    const context: LoggingContext = {
      traceId: randomUUID(),
      requestId,
      env: this.appConfig.nodeEnv,
      level: LogLevel.LOG,
      startTime: process.hrtime(),
      payload: {
        requestId,
        env: this.appConfig.nodeEnv,
        context: 'http',
        action: `${method} ${originalUrl}`,
        path: originalUrl,
        method,
        client: {
          ip: ip || '',
          userAgent,
        },
      },
    };

    // Run the entire request in the Wide Event context
    this.logger.run(context, () => {
      next();
    });
  }
}
