import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { Event, EventSchema } from '../event/schemas/event.schema';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingExpiryProcessor } from './processors/booking-expiry.processor';
import { PaymentEventListener } from './listeners/payment-event.listener';
import { UserModule } from '../user/user.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    BullModule.registerQueue({ name: 'booking-expiry' }),
    UserModule,
    AvailabilityModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingExpiryProcessor, PaymentEventListener],
  exports: [BookingService],
})
export class BookingModule {}
