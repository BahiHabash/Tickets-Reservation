import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { RolesGuard } from '../user/guards/roles.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { UserRole } from '../user/enums/user-role.enum';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums/logs.enum';
import { GetUser } from '../user/decorators/get-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { Types } from 'mongoose';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly logger: LoggingService,
  ) {}

  @Post('pay/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async pay(
    @Param('bookingId', ParseObjectIdPipe) bookingId: Types.ObjectId,
    @GetUser('sub', ParseObjectIdPipe) userId: Types.ObjectId,
  ) {
    this.logger.assign({
      action: LogAction.PROCESS_PAYMENT,
      messages: ['Payment request received.'],
    });

    return this.paymentsService.processPayment(bookingId, userId);
  }
}
