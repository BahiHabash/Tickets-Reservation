import {
  ConsoleLogger,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { LogLevel } from '../../common/enums/logs.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AsyncLocalStorage } from 'async_hooks';
import { WideEventLog, WideEventLogDocument } from './wide-event.schema';

export interface WideEventPayload {
  requestId: string;
  env: string;
  service?: string;
  action?: string;
  context?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  outcome?: string;
  durationMs?: number;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  client?: {
    ip: string;
    userAgent: string;
  };
  error?: {
    type: string;
    message: string[];
    stack?: string;
  };
  messages?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WideEventContext {
  traceId: string;
  requestId: string;
  env: string;
  startTime: [number, number];
  payload: WideEventPayload;
  level: LogLevel;
}

@Injectable()
export class WideEventLoggerService
  extends ConsoleLogger
  implements LoggerService, OnModuleInit
{
  public static readonly storage = new AsyncLocalStorage<WideEventContext>();

  constructor(
    @InjectModel(WideEventLog.name)
    private readonly logModel: Model<WideEventLogDocument>,
  ) {
    super();
  }

  onModuleInit() {
    this.log('WideEventLoggerService initialized', 'Logger');
  }

  /**
   * Returns the current Wide Event context if it exists.
   */
  getStore(): WideEventContext | undefined {
    return WideEventLoggerService.storage.getStore();
  }

  /**
   * Runs a function within a new Wide Event context.
   */
  run<T>(context: WideEventContext, fn: () => T): T {
    return WideEventLoggerService.storage.run(context, fn);
  }

  /**
   * Adds metadata or identifiers to the current Wide Event context.
   */
  assign(payload: Partial<WideEventPayload>): void {
    const context = this.getStore();
    if (context) {
      const { metadata, messages, ...rest } = payload;
      context.payload = {
        ...context.payload,
        ...rest,
        messages: messages
          ? [...(context.payload.messages || []), ...messages]
          : context.payload.messages,
        metadata: {
          ...context.payload.metadata,
          ...metadata,
        },
      };

      // Ensure level is upgraded if needed
      if (
        rest.level &&
        this.isMoreSevere(rest.level as LogLevel, context.level)
      ) {
        context.level = rest.level as LogLevel;
      }
    }
  }

  /**
   * Persists the Wide Event to MongoDB.
   */
  async persist(context: WideEventContext): Promise<void> {
    const { payload, level } = context;
    const {
      action,
      durationMs,
      context: pContext,
      level: pLevel,
      method: pMethod,
      path: pPath,
      statusCode: pStatusCode,
      outcome: pOutcome,
      user: pUser,
      client: pClient,
      error: pError,
      messages: pMessages,
      metadata,
      ...rest
    } = payload;

    const doc: Partial<WideEventLog> = {
      traceId: context.traceId,
      requestId: context.requestId,
      env: context.env,
      timestamp: new Date(),
      level: (pLevel as LogLevel) || level || LogLevel.LOG,
      context: (pContext as string) || (payload.context as string),
      action: action as string,
      method: pMethod as string,
      path: pPath as string,
      statusCode: pStatusCode as number,
      outcome: pOutcome as string,
      durationMs,
      user: pUser,
      client: pClient,
      error: pError,
      messages: pMessages || payload.messages || [],
      metadata:
        Object.keys({ ...metadata, ...rest }).length > 0
          ? new Map(Object.entries({ ...metadata, ...rest }))
          : undefined,
    };

    try {
      await this.logModel.create(doc);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      process.stderr.write(
        `[LoggerFallback] Failed to persist log: ${errorMessage}\n`,
      );
    }
  }

  /**
   * Outputs the Wide Event as a JSON object to the console.
   */
  logEvent(context: WideEventContext): void {
    const { level, statusCode } = context.payload; // Extract level and statusCode from payload
    const logObject = {
      timestamp: new Date().toISOString(),
      level: context.level,
      ...context.payload,
      traceId: context.traceId,
      requestId: context.requestId,
      env: context.env,
    };

    // Use JSON.stringify for machine-readable output as requested
    // 1. Always keep errors: 100% of 500s, exceptions, and failures
    if (
      level === LogLevel.ERROR ||
      level === LogLevel.FATAL ||
      (statusCode && statusCode >= 500)
    ) {
      process.stderr.write(`${JSON.stringify(logObject)}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(logObject)}\n`);
    }
  }

  private isMoreSevere(newLevel: LogLevel, currentLevel: LogLevel): boolean {
    const priority = {
      [LogLevel.VERBOSE]: 0,
      [LogLevel.DEBUG]: 1,
      [LogLevel.LOG]: 2,
      [LogLevel.WARN]: 3,
      [LogLevel.ERROR]: 4,
      [LogLevel.FATAL]: 5,
    };
    return priority[newLevel] > priority[currentLevel];
  }
}
