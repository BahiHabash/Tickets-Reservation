import { Injectable, LoggerService } from '@nestjs/common';
import { LogLevel } from '../../common/enums/log-level.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { WideEventLog, WideEventLogDocument } from './wide-event.schema';

interface WideEventPayload {
  action?: string;
  userId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  ticketId?: Types.ObjectId;
  durationMs?: number;
  traceId?: string;
  [key: string]: unknown;
}

@Injectable()
export class WideEventLoggerService implements LoggerService {
  constructor(
    @InjectModel(WideEventLog.name)
    private readonly logModel: Model<WideEventLogDocument>,
  ) {}

  log(message: string, context?: string): void;
  log(message: string, payload?: WideEventPayload, context?: string): void;
  log(
    message: string,
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(payloadOrContext, context);
    this.persist(LogLevel.LOG, message, ctx, payload);
    this.writeToStdout('LOG', message, ctx);
  }

  error(message: string, trace?: string, context?: string): void;
  error(message: string, payload?: WideEventPayload, context?: string): void;
  error(
    message: string,
    traceOrPayload?: string | WideEventPayload,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(traceOrPayload, context);
    this.persist(LogLevel.ERROR, message, ctx, payload);
    this.writeToStderr('ERROR', message, ctx);
  }

  warn(message: string, context?: string): void;
  warn(message: string, payload?: WideEventPayload, context?: string): void;
  warn(
    message: string,
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(payloadOrContext, context);
    this.persist(LogLevel.WARN, message, ctx, payload);
    this.writeToStdout('WARN', message, ctx);
  }

  debug(message: string, context?: string): void;
  debug(message: string, payload?: WideEventPayload, context?: string): void;
  debug(
    message: string,
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(payloadOrContext, context);
    this.persist(LogLevel.DEBUG, message, ctx, payload);
    this.writeToStdout('DEBUG', message, ctx);
  }

  verbose(message: string, context?: string): void;
  verbose(message: string, payload?: WideEventPayload, context?: string): void;
  verbose(
    message: string,
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(payloadOrContext, context);
    this.persist(LogLevel.VERBOSE, message, ctx, payload);
    this.writeToStdout('VERBOSE', message, ctx);
  }

  fatal(message: string, context?: string): void;
  fatal(message: string, payload?: WideEventPayload, context?: string): void;
  fatal(
    message: string,
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): void {
    const { payload, ctx } = this.parseArgs(payloadOrContext, context);
    this.persist(LogLevel.FATAL, message, ctx, payload);
    this.writeToStderr('FATAL', message, ctx);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private parseArgs(
    payloadOrContext?: WideEventPayload | string,
    context?: string,
  ): { payload: WideEventPayload; ctx?: string } {
    if (typeof payloadOrContext === 'string') {
      return { payload: {}, ctx: payloadOrContext };
    }
    return { payload: payloadOrContext || {}, ctx: context };
  }

  private persist(
    level: LogLevel,
    message: string,
    context?: string,
    payload: WideEventPayload = {},
  ): void {
    const { action, userId, eventId, ticketId, durationMs, traceId, ...rest } =
      payload;

    const doc: Partial<WideEventLog> = {
      traceId: traceId || randomUUID(),
      userId: userId,
      eventId: eventId,
      timestamp: new Date(),
      level,
      message,
      context,
      action,
      ticketId,
      durationMs,
      metadata:
        Object.keys(rest).length > 0
          ? new Map(Object.entries(rest))
          : undefined,
    };

    // Fire-and-forget write — never block the request pipeline
    this.logModel.create(doc).catch(() => {
      // Fallback: if DB write fails, write to stderr so logs aren't lost
      process.stderr.write(
        `[LoggerFallback] Failed to persist log: ${JSON.stringify(doc)}\n`,
      );
    });
  }

  private writeToStdout(level: string, message: string, ctx?: string): void {
    const timestamp = new Date().toISOString();
    const prefix = ctx ? `[${ctx}]` : '';
    process.stdout.write(`${timestamp} ${level} ${prefix} ${message}\n`);
  }

  private writeToStderr(level: string, message: string, ctx?: string): void {
    const timestamp = new Date().toISOString();
    const prefix = ctx ? `[${ctx}]` : '';
    process.stderr.write(`${timestamp} ${level} ${prefix} ${message}\n`);
  }
}
