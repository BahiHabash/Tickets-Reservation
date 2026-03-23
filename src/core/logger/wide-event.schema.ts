import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LogLevel } from '../../common/enums/logs.enum';
import { UserRole } from '../../common/enums/user-role.enum';

export type WideEventLogDocument = HydratedDocument<WideEventLog>;

@Schema({ _id: false })
class UserLogInfo {
  @Prop({ type: String })
  id?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String, enum: Object.values(UserRole) })
  role?: string;
}

@Schema({ _id: false })
class ClientLogInfo {
  @Prop({ type: String })
  ip: string;

  @Prop({ type: String })
  userAgent: string;
}

@Schema({ _id: false })
class ErrorLogInfo {
  @Prop({ type: String })
  type: string;

  @Prop({ type: [String] })
  message: string[];

  @Prop({ type: String })
  stack?: string;
}

@Schema({
  collection: 'logs',
  timestamps: false,
  versionKey: false,
})
export class WideEventLog {
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
    enum: Object.values(LogLevel),
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

  @Prop({ type: [String] })
  messages?: string[];

  @Prop({ type: Map, of: Object })
  metadata?: Map<string, unknown>;

  @Prop({ type: Types.ObjectId })
  ticketId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  eventId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  paymentId?: Types.ObjectId;
}

export const WideEventLogSchema = SchemaFactory.createForClass(WideEventLog);
