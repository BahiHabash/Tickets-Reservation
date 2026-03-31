import { UserLogInfo } from '../logging.schema';
import { ClientLogInfo } from '../logging.schema';
import { EventLogInfo } from '../logging.schema';
import { PaymentLogInfo } from '../logging.schema';
import { BookingLogInfo } from '../logging.schema';
import { TicketLogInfo } from '../logging.schema';
import { ErrorLogInfo } from '../logging.schema';

export interface LoggingPayload {
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
  user?: UserLogInfo;
  client?: ClientLogInfo;
  event?: EventLogInfo;
  payment?: PaymentLogInfo;
  booking?: BookingLogInfo;
  ticket?: TicketLogInfo;
  error?: ErrorLogInfo;
  messages?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
