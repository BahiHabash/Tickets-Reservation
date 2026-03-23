import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LogLevel } from '../../common/enums/log-level.enum';

export type WideEventLogDocument = HydratedDocument<WideEventLog>;

@Schema({
  collection: 'logs',
  timestamps: false,
  versionKey: false,
})
export class WideEventLog {
  @Prop({ type: String, required: true })
  traceId: string;

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

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event' })
  eventId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  ticketId?: Types.ObjectId;

  @Prop({ type: Number })
  durationMs?: number;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Map, of: Object })
  metadata?: Map<string, unknown>;
}

export const WideEventLogSchema = SchemaFactory.createForClass(WideEventLog);
