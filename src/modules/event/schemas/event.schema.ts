import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Prop({ required: true, min: 1 })
  totalCapacity: number;

  @Prop({ required: true, min: 0 })
  availableTickets: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
