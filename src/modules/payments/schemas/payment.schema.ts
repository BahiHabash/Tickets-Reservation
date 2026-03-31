import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency } from '../../../common/enums';
import { PaymentMethod, PaymentStatus, PaymentGateway } from '../enums/index';

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true })
  paymentId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Booking' })
  bookingId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: Currency })
  currency: Currency;

  @Prop({ required: true, enum: PaymentStatus })
  status: PaymentStatus;

  @Prop({ required: true })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, type: String, enum: PaymentGateway })
  paymentGateway: PaymentGateway;

  @Prop({ required: true })
  transactionId: string;

  @Prop({ required: true, type: Object })
  gatewayResponse: Record<string, any>;

  @Prop({ required: true })
  paidAt: Date;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
