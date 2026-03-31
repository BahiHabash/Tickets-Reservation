import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { RolesGuard } from '../user/guards/roles.guard';
import { AnyRole } from '../user/decorators/any-role.decorator';
import { UserRole } from '../user/enums/user-role.enum';
import { Roles } from '../user/decorators/roles.decorator';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums/logs.enum';
import type { Payload } from '../../common/interfaces';
import { GetUser } from '../user/decorators/get-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Types } from 'mongoose';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly logger: LoggingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async createBooking(
    @Body() dto: CreateBookingDto,
    @GetUser('sub', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    this.logger.assign({
      action: LogAction.RESERVE_TICKET,
      messages: ['Create booking request received.'],
    });

    return this.bookingService.createBooking(
      userId,
      dto.eventId,
      dto.quantity,
      dto.idempotencyKey,
    );
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @AnyRole()
  async getMyBookings(@GetUser() user: Payload) {
    this.logger.assign({
      action: LogAction.GET_MY_BOOKINGS,
      messages: ['Fetching user bookings.'],
    });

    return this.bookingService.getUserBookings(user.sub);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @AnyRole()
  async cancelBooking(
    @Param('id', ParseObjectIdPipe) id: string,
    @GetUser() user: Payload,
  ) {
    this.logger.assign({
      action: LogAction.CANCEL_BOOKING,
      booking: { id },
      messages: ['Cancel booking request received.'],
    });

    await this.bookingService.cancelBooking(id, user.sub);
    return { message: 'Booking cancelled successfully' };
  }
}
