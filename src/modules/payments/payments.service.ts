import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Booking } from '../booking/schemas/booking.schema';
import { BookingStatus } from '../booking/enums/booking-status.enum';
import { LoggingService } from '../../core/logging';
import { PaymentStatus, PaymentMethod } from './enums';
import {
  formatBookingLog,
  formatPaymentLog,
} from '../../common/helpers/log-formatters.helper';
import { Payment } from './schemas/payment.schema';
import { BookingService } from '../booking/booking.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectConnection() private readonly connection: Connection,
    private readonly bookingService: BookingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Mock payment processor.
   * Simulates 1.5s gateway delay with 80% success rate.
   */
  async processPayment(
    bookingId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<{ success: boolean }> {
    // check if payment already exists
    const isPaymentExisted: Payment | null = await this.paymentModel
      .findOne({ bookingId: bookingId })
      .exec();

    if (isPaymentExisted) {
      this.logger.assign({
        messages: [`Payment already exists for this booking.`],
      });
      throw new NotFoundException(`Payment already exists for this booking`);
    }

    // check if booking exists
    const booking: Booking | null =
      await this.bookingService.getBookingById(bookingId);

    if (!booking) {
      this.logger.assign({
        booking: formatBookingLog({ _id: new Types.ObjectId(bookingId) }),
        messages: [`Booking not found.`],
      });
      throw new NotFoundException(`Booking not found.`);
    }

    // Simulate payment gateway delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const success = this.shouldSucceed();

    if (!success) {
      this.logger.assign({
        booking: formatBookingLog({
          ...booking,
          status: BookingStatus.FAILED,
        }),
        payment: formatPaymentLog({
          status: PaymentStatus.FAILED,
          amount: booking.amountTotal,
        }),
        messages: [`Payment failed — emitting ${PaymentStatus.FAILED}`],
      });

      this.eventEmitter.emit(PaymentStatus.FAILED, { bookingId });

      throw new BadRequestException(`Payment failed`);
    }

    const payment = {
      paymentId: `PAY-${Date.now()}`,
      bookingId: new Types.ObjectId(bookingId),
      userId: new Types.ObjectId(userId),
      amount: booking.amountTotal,
      currency: booking.currency,
      status: PaymentStatus.SUCCEEDED,
      paymentMethod: PaymentMethod.CARD,
      paymentGateway: booking.paymentGateway,
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      gatewayResponse: { success: true, timestamp: new Date() },
      paidAt: new Date(),
    };

    await this.paymentModel.create(payment);

    this.logger.assign({
      payment: formatPaymentLog(payment),
      booking: formatBookingLog(booking),
      messages: ['Payment succeeded — emitting payment.success'],
    });

    this.eventEmitter.emit(PaymentStatus.SUCCEEDED, { bookingId });

    return { success };
  }

  shouldSucceed(): boolean {
    return Math.random() < 0.8;
  }
}
