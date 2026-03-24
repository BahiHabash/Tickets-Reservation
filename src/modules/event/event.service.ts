import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type Types } from 'mongoose';
import { Event } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { WideEventLoggerService } from '../../core/logger';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    private readonly logger: WideEventLoggerService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    this.logger.assign({
      messages: ['Creating new event in database'],
    });

    if (new Date(createEventDto.date) < new Date()) {
      this.logger.assign({ messages: ['Event date is in the past'] });
      throw new BadRequestException(
        'Event date is in the past, please provide a valid date',
      );
    }

    const createdEvent = new this.eventModel({
      ...createEventDto,
      availableTickets: createEventDto.totalCapacity,
    });

    const savedEvent = await createdEvent.save();

    this.logger.assign({
      event: {
        id: savedEvent._id.toString(),
        title: savedEvent.title,
        date: savedEvent.date.toString(),
        price: savedEvent.price,
        totalCapacity: savedEvent.totalCapacity,
      },
      messages: [`Event created successfully.`],
    });

    return savedEvent;
  }

  async findAll(): Promise<Event[]> {
    this.logger.assign({
      messages: ['Fetching all events from database'],
    });

    const events = await this.eventModel.find().exec();

    this.logger.assign({
      metadata: {
        eventsCount: events.length,
      },
      messages: ['Events fetched successfully'],
    });

    return events;
  }

  async findOne(id: string): Promise<Event> {
    this.logger.assign({
      messages: ['Fetching event from database'],
    });

    const event = await this.eventModel.findById(id).exec();

    if (!event) {
      this.logger.assign({ messages: ['Event not found'] });
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    this.logger.assign({
      event: {
        id: event._id.toString(),
        title: event.title,
        date: event.date.toString(),
        price: event.price,
        totalCapacity: event.totalCapacity,
      },
      messages: ['Event details fetched successfully'],
    });

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    this.logger.assign({
      messages: ['Updating event in database'],
    });

    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();

    if (!updatedEvent) {
      this.logger.assign({ messages: ['Event not found for update'] });
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    this.logger.assign({
      event: {
        id: updatedEvent._id.toString(),
        title: updatedEvent.title,
        date: updatedEvent.date.toString(),
        price: updatedEvent.price,
        totalCapacity: updatedEvent.totalCapacity,
      },
      messages: ['Event updated successfully'],
    });

    return updatedEvent;
  }

  async remove(id: string): Promise<void> {
    this.logger.assign({
      messages: ['Removing event from database'],
    });

    const result = await this.eventModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.assign({ messages: ['Event not found for deletion'] });
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    this.logger.assign({
      event: { id },
      messages: ['Event deleted successfully'],
    });
  }
}
