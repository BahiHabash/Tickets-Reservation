import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BookingService } from '../booking.service';
import { LoggingService } from '../../../core/logging';
import { LogAction } from '../../../common/enums/logs.enum';

@Processor('booking-expiry')
export class BookingExpiryProcessor extends WorkerHost {
  constructor(
    private readonly BookingService: BookingService,
    private readonly logger: LoggingService,
  ) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<void> {
    const { bookingId } = job.data;

    this.logger.assign({
      action: LogAction.EXPIRE_BOOKING,
      messages: [`Expiry job fired for booking ${bookingId}`],
    });

    await this.BookingService.expireBooking(bookingId);
  }
}
