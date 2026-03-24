import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { RolesGuard } from '../user/guards/roles.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { AnyRole } from '../user/decorators/guest.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { WideEventLoggerService } from '../../core/logger';
import { LogAction } from '../../common/enums/logs.enum';
import type { Payload, RequestWithUser } from '../../common/interfaces';
import { GetUser } from '../user/decorators/get-user.decorator';

@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: WideEventLoggerService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: RequestWithUser,
  ) {
    this.logger.assign({
      action: LogAction.CREATE_EVENT,
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
      messages: [`Create event request received.`],
    });

    const event = await this.eventService.create(createEventDto);

    return event;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @AnyRole()
  async findAll(@GetUser() user: Payload) {
    this.logger.assign({
      action: LogAction.GET_EVENTS,
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
      },
      messages: ['Fetching all events'],
    });

    const events = await this.eventService.findAll();

    this.logger.assign({
      metadata: {
        length: events.length,
      },
    });

    return events;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @AnyRole()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @GetUser() user: Payload,
  ) {
    this.logger.assign({
      action: LogAction.GET_EVENT,
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
      },
      messages: [`Fetch event details request received.`],
    });
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @GetUser() user: Payload,
  ) {
    this.logger.assign({
      action: LogAction.UPDATE_EVENT,
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
      },
      messages: [`Update event request received.`],
    });

    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @GetUser() user: Payload,
  ) {
    this.logger.assign({
      action: LogAction.DELETE_EVENT,
      user: {
        id: user.sub,
        email: user.email,
        role: user.role,
      },
      messages: [`Delete event request received.`],
    });

    return this.eventService.remove(id);
  }
}
