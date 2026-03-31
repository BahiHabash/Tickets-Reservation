import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Currency } from '../../../common/enums';
import { EventStatus } from '../enums/event-status.enum';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  location?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, type: String, enum: Currency, default: Currency.USD })
  currency: Currency;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ required: true, min: 0 })
  availableTickets: number;

  @Prop({
    required: true,
    type: String,
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;
}

export type EventDocument = Event & Document;
export const EventSchema = SchemaFactory.createForClass(Event);

// Fast lookup: only show PUBLISHED events to booking system
EventSchema.index({ status: 1 });

// Admin management — list future events quickly
EventSchema.index({ date: 1, status: 1 });
