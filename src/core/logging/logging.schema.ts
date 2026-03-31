import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LogLevel } from '../../common/enums/logs.enum';
import { UserRole } from '../../modules/user/enums/user-role.enum';
import { Currency } from '../../common/enums';
import { EventStatus } from '../../modules/event/enums/event-status.enum';
import { BookingStatus } from '../../modules/booking/enums/booking-status.enum';

export type LoggingDocument = HydratedDocument<Logging>;

@Schema({ _id: false })
export class UserLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String, enum: Object.values(UserRole) })
  role?: string;
}

@Schema({ _id: false })
export class ClientLogInfo {
  @Prop({ type: String })
  ip: string;

  @Prop({ type: String })
  userAgent: string;
}

@Schema({ _id: false })
export class ErrorLogInfo {
  @Prop({ type: String })
  type: string;

  @Prop({ type: [String] })
  message: string[];

  @Prop({ type: String })
  stack?: string;
}

@Schema({ _id: false })
export class EventLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  title?: string;

  @Prop({ type: String })
  date?: string;

  @Prop({ type: Number })
  price?: number;

  @Prop({ type: Number })
  capacity?: number;

  @Prop({ type: Number })
  availableTickets?: number;

  @Prop({ type: String, enum: EventStatus })
  status?: EventStatus;

  @Prop({ type: String, enum: Currency })
  currency?: Currency;
}

@Schema({ _id: false })
export class PaymentLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: String })
  currency?: string;

  @Prop({ type: String })
  method?: string;

  @Prop({ type: String })
  transactionId?: string;

  @Prop({ type: Date })
  paidAt?: Date;
}

@Schema({ _id: false })
export class BookingLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String, enum: BookingStatus })
  status?: BookingStatus;

  @Prop({ type: String })
  expiresAt?: string;

  @Prop({ type: Number })
  amountTotal?: number;

  @Prop({ type: Number })
  quantity?: number;
}

@Schema({ _id: false })
export class TicketLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  code?: string;

  @Prop({ type: String })
  status?: string;
}

@Schema({
  collection: 'logs',
  timestamps: false,
  versionKey: false,
})
export class Logging {
  @Prop({ type: String, required: true })
  traceId: string;

  @Prop({ type: String, required: true })
  requestId: string;

  @Prop({ type: String, required: true })
  env: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  timestamp: Date;

  @Prop({
    type: String,
    required: true,
    enum: LogLevel,
  })
  level: LogLevel;

  @Prop({ type: String })
  action?: string;

  @Prop({ type: String })
  context?: string;

  @Prop({ type: String })
  method?: string;

  @Prop({ type: String })
  path?: string;

  @Prop({ type: Number })
  statusCode?: number;

  @Prop({ type: String })
  outcome?: string;

  @Prop({ type: Number })
  durationMs?: number;

  @Prop({ type: UserLogInfo })
  user?: UserLogInfo;

  @Prop({ type: ClientLogInfo })
  client?: ClientLogInfo;

  @Prop({ type: ErrorLogInfo })
  error?: ErrorLogInfo;

  @Prop({ type: EventLogInfo })
  event?: EventLogInfo;

  @Prop({ type: PaymentLogInfo })
  payment?: PaymentLogInfo;

  @Prop({ type: BookingLogInfo })
  booking?: BookingLogInfo;

  @Prop({ type: TicketLogInfo })
  ticket?: TicketLogInfo;

  @Prop({ type: [String] })
  messages?: string[];

  @Prop({ type: Map, of: Object })
  metadata?: Map<string, unknown>;

  @Prop({ type: Types.ObjectId })
  ticketId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  paymentId?: Types.ObjectId;
}

export const LoggingSchema = SchemaFactory.createForClass(Logging);
