import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AnyRole } from '../user/decorators/any-role.decorator';
import { GetUser } from '../user/decorators/get-user.decorator';
import { TicketsService } from './tickets.service';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums';
import type { Payload } from '../../common/interfaces';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Get all valid tickets for the authenticated user.
   *
   * @route GET /tickets/my
   */
  @Get('my')
  @AnyRole()
  async getMyTickets(@GetUser() user: Payload): Promise<unknown> {
    this.logger.assign({
      action: LogAction.GET_MY_TICKETS,
      user: { id: user.sub, email: user.email, role: user.role },
    });

    const tickets = await this.ticketsService.getUserTickets(user.sub);

    this.logger.assign({
      messages: [
        `Retrieved ${tickets.length} ticket(s) for userId=${user.sub}`,
      ],
    });

    return tickets;
  }
}
