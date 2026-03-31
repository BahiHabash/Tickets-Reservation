import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingStatus } from '../enums/booking-status.enum';
import { PaymentGateway } from '../../payments/enums/payment-gateway.enum';
import { Currency } from 'src/common';

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  event: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({
    required: true,
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: PaymentGateway.STRIPE, enum: PaymentGateway })
  paymentGateway: PaymentGateway;

  @Prop({ type: String, default: null })
  checkoutSessionId: string | null;

  @Prop({ type: String, default: null })
  paymentIntentId: string | null;

  @Prop({ required: true, min: 0 })
  amountTotal: number;

  @Prop({ required: true, default: Currency.USD })
  currency: Currency;
}

export type BookingDocument = Booking & Document;
export const BookingSchema = SchemaFactory.createForClass(Booking);

// Reaper query: find PENDING bookings past their expiry
BookingSchema.index({ status: 1, expiresAt: 1 });

// Fast webhook lookups — sparse so null values are excluded
BookingSchema.index({ checkoutSessionId: 1 }, { sparse: true, unique: true });
