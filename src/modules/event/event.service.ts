import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types, type FilterQuery } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { LoggingService } from '../../core/logging';
import { CachingService } from '../../core/caching';
import { AvailabilityService } from '../availability/availability.service';
import { EventStatus } from './enums/event-status.enum';
import { LogAction } from '../../common/enums/logs.enum';
import { EventMeta } from '../../common/interfaces';
import { formatEventLog } from '../../common/helpers';
import { EventStorageService } from '../availability/event.storage';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    private readonly cachingService: CachingService,
    private readonly availabilityService: AvailabilityService,
    private readonly logger: LoggingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStorageService: EventStorageService,
  ) {}

  // ─── Key Helpers ────────────────────────────────────────────────

  /**
   * Creates a new event in DRAFT status.
   * availableTickets is initialized to capacity.
   *
   * @param createEventDto Validated event creation payload
   * @returns The created Event document
   * @throws BadRequestException if event date is in the past
   */
  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
    this.logger.assign({ messages: ['Creating new event in database'] });

    if (new Date(createEventDto.date) < new Date()) {
      this.logger.assign({ messages: ['Event date is in the past'] });
      throw new BadRequestException(
        'Event date is in the past, please provide a valid date',
      );
    }

    const createdEvent = new this.eventModel({
      ...createEventDto,
      availableTickets: createEventDto.capacity,
      status: EventStatus.DRAFT,
    });

    const savedEvent = await createdEvent.save();

    this.logger.assign({
      event: formatEventLog(savedEvent),
      messages: ['Event created successfully'],
    });

    return savedEvent;
  }

  /**
   * Returns all events (admin-facing, no status filter).
   *
   * @returns Array of Event documents
   */
  async findAll(): Promise<EventDocument[]> {
    this.logger.assign({ messages: ['Fetching all events from database'] });

    const events = await this.eventModel.find().exec();

    this.logger.assign({
      metadata: { eventsCount: events.length },
      messages: ['Events fetched successfully'],
    });

    return events;
  }

  /**
   * Cache-aside read: returns event from Redis meta or falls back to MongoDB.
   *
   * @param id The event ID
   * @returns The Event document
   * @throws NotFoundException if not found in either layer
   */
  async findOne(id: Types.ObjectId): Promise<Partial<EventDocument>> {
    this.logger.assign({ messages: ['Fetching event — cache-aside read'] });

    // 1. Try Redis meta cache first
    const cached = await this.eventStorageService.getEvent(id);

    if (cached) {
      this.logger.assign({
        messages: ['Cache HIT — returning from Redis meta'],
      });

      // Return a lightweight plain object shaped like the document
      return {
        _id: id,
        title: cached.title,
        price: cached.price,
        date: new Date(cached.date),
        status: cached.status,
        availableTickets: cached.availableTickets,
      };
    }

    // 2. Cache MISS — load from MongoDB
    this.logger.assign({ messages: ['Cache MISS — querying MongoDB'] });
    const event = await this.eventModel.findById(id).exec();

    if (!event) {
      this.logger.assign({ messages: ['Event not found'] });
      throw new NotFoundException(`Event with ID ${id.toString()} not found`);
    }

    this.logger.assign({
      event: formatEventLog(event),
      messages: ['Event fetched from MongoDB'],
    });

    return event;
  }

  /**
   * Updates an existing event and invalidates the Redis meta cache.
   * If the event is PUBLISHED, refreshes the Redis meta after update.
   *
   * @param id The event ID
   * @param updateEventDto Validated update payload
   * @returns The updated Event document
   * @throws NotFoundException if event does not exist
   * @throws BadRequestException if new capacity < availableTickets
   */
  async update(
    id: Types.ObjectId,
    updateEventDto: UpdateEventDto,
  ): Promise<EventDocument> {
    this.logger.assign({ messages: ['Updating event in database'] });

    const filter: FilterQuery<EventDocument> = { _id: id };
    if (updateEventDto.capacity !== undefined) {
      filter.availableTickets = { $lte: updateEventDto.capacity };
    }

    const updatedEvent = await this.eventModel.findOneAndUpdate(
      filter,
      updateEventDto,
      { new: true },
    );

    if (!updatedEvent) {
      const exists = await this.eventModel.exists({ _id: id });

      if (!exists) {
        this.logger.assign({ messages: ['Event not found for update'] });
        throw new NotFoundException(`Event with ID ${id.toString()} not found`);
      }

      this.logger.assign({
        messages: ['Update failed: new capacity < current availableTickets'],
      });
      throw new BadRequestException(
        'Event total capacity is less than available tickets',
      );
    }

    this.logger.assign({ messages: ['Event updated successfully in MongoDB'] });

    // Refresh Redis meta if event is PUBLISHED
    if (updatedEvent.status === EventStatus.PUBLISHED) {
      await this.eventStorageService.setEventMeta(id, updatedEvent);
      this.logger.assign({ messages: ['Redis meta refreshed after update'] });
    } else {
      // Ensure stale cache is invalidated for non-published events
      await this.eventStorageService.delEventMeta(id);
    }

    return updatedEvent;
  }

  /**
   * Permanently removes an event and clears all Redis keys.
   *
   * @param id The event ID
   * @throws NotFoundException if event does not exist
   */
  async remove(id: Types.ObjectId): Promise<void> {
    this.logger.assign({ messages: ['Removing event from database'] });

    const result = await this.eventModel.findByIdAndDelete(id).exec();

    if (!result) {
      this.logger.assign({ messages: ['Event not found for deletion'] });
      throw new NotFoundException(`Event with ID ${id.toString()} not found`);
    }

    await this.eventStorageService.delEventMeta(id);
    await this.availabilityService.deleteEventSlots(id);

    this.logger.assign({
      event: formatEventLog(result),
      messages: ['Event deleted — Redis cache purged'],
    });
  }

  /**
   * DRAFT → PUBLISHED state transition.
   * Initializes the Redis slot counter and meta hash.
   *
   * @param id The event ID
   * @returns The updated Event document
   * @throws NotFoundException if event does not exist
   * @throws ConflictException if event is not in DRAFT status
   */
  async publishEvent(id: Types.ObjectId): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).exec();

    if (!event) {
      this.logger.assign({ messages: ['Event not found for publish'] });
      throw new NotFoundException(`Event with ID ${id.toString()} not found`);
    }

    if (event.status !== EventStatus.DRAFT) {
      this.logger.assign({
        messages: [`Publish rejected: event status is '${event.status}'`],
      });
      throw new ConflictException(
        `Event cannot be published — current status: ${event.status}`,
      );
    }

    event.status = EventStatus.PUBLISHED;
    await event.save();

    await this.availabilityService.setEventSlots(
      id.toString(),
      event.capacity,
      event.date,
    );
    await this.eventStorageService.setEventMeta(id, event);

    this.logger.assign({
      event: formatEventLog(event),
      messages: ['Event published — Redis inventory & meta initialized'],
    });

    return event;
  }

  /**
   * PUBLISHED → CANCELED state transition.
   * Purges Redis, then emits 'event.canceled' domain event.
   * BookingModule listens and handles refunds/invalidations.
   *
   * @param id The event ID
   * @returns The canceled Event document
   * @throws NotFoundException if event does not exist
   * @throws ConflictException if event is not PUBLISHED
   */
  async cancelEvent(id: Types.ObjectId): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).exec();

    if (!event) {
      this.logger.assign({ messages: ['Event not found for cancellation'] });
      throw new NotFoundException(`Event with ID ${id.toString()} not found`);
    }

    if (event.status !== EventStatus.PUBLISHED) {
      this.logger.assign({
        messages: [`Cancel rejected: event status is '${event.status}'`],
      });
      throw new ConflictException(
        `Only PUBLISHED events can be canceled — current status: ${event.status}`,
      );
    }

    event.status = EventStatus.CANCELED;
    await event.save();

    // Purge Redis inventory & meta
    await this.availabilityService.deleteEventSlots(id);
    await this.eventStorageService.delEventMeta(id);

    this.logger.assign({
      action: LogAction.CANCEL_EVENT,
      event: formatEventLog(event),
      messages: ['Event canceled — Redis cache purged'],
    });

    // Emit domain event for downstream consumers (BookingModule, NotificationModule)
    this.eventEmitter.emit('event.canceled', {
      eventId: id,
      title: event.title,
    });

    this.logger.assign({
      messages: ['Domain event "event.canceled" emitted'],
    });

    return event;
  }

  /**
   * Returns the meta of an event.
   *
   * @param event The event document
   * @returns The event meta
   */
  getEventMeta(event: EventDocument): EventMeta {
    return {
      title: event.title,
      price: event.price,
      date: event.date,
      status: event.status,
      capacity: event.capacity,
      currency: event.currency,
      availableTickets: event.availableTickets,
    };
  }
}
