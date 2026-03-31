import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { RolesGuard } from '../user/guards/roles.guard';
import { Roles } from '../user/decorators/roles.decorator';
import { AnyRole } from '../user/decorators/any-role.decorator';
import { UserRole } from '../user/enums/user-role.enum';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums/logs.enum';
import type { Types } from 'mongoose';

@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: LoggingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createEventDto: CreateEventDto) {
    this.logger.assign({
      action: LogAction.CREATE_EVENT,
      messages: [`Create event request received.`],
    });

    const event = await this.eventService.create(createEventDto);

    return event;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @AnyRole()
  async findAll() {
    this.logger.assign({
      action: LogAction.GET_EVENTS,
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
  async findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    this.logger.assign({
      action: LogAction.GET_EVENT,
      messages: [`Fetch event details request received.`],
    });
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    this.logger.assign({
      action: LogAction.UPDATE_EVENT,
      messages: [`Update event request received.`],
    });

    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    this.logger.assign({
      action: LogAction.DELETE_EVENT,
      messages: [`Delete event request received.`],
    });

    return this.eventService.remove(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async publish(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    this.logger.assign({
      action: LogAction.PUBLISH_EVENT,
      messages: ['Publish event request received.'],
    });

    return this.eventService.publishEvent(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async cancel(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    this.logger.assign({
      action: LogAction.CANCEL_EVENT,
      messages: ['Cancel event request received'],
    });

    return this.eventService.cancelEvent(id);
  }
}
