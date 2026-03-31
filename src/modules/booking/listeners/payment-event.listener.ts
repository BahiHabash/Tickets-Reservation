import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BookingService } from '../booking.service';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';

@Injectable()
export class PaymentEventListener {
  constructor(private readonly bookingService: BookingService) {}

  @OnEvent(PaymentStatus.SUCCEEDED)
  async handlePaymentSuccess(payload: { bookingId: string }): Promise<void> {
    await this.bookingService.handlePaymentSuccess(payload);
  }

  @OnEvent(PaymentStatus.FAILED)
  async handlePaymentFailed(payload: { bookingId: string }): Promise<void> {
    await this.bookingService.handlePaymentFailed(payload);
  }
}
