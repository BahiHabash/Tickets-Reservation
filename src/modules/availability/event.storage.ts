import { Injectable } from '@nestjs/common';
import { Event, type EventDocument } from '../event/schemas/event.schema';
import { CachingService } from '../../core/caching';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggingService } from '../../core/logging';
import { formatEventMeta } from '../../common/helpers';
import { CachingKeys } from './availability.constants';
import { EventMeta } from '../../common';

@Injectable()
export class EventStorageService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    private readonly cachingService: CachingService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * return event from cahce and update cache to match db if not cached
   * @param eventId
   * @returns
   */
  async getEvent(eventId: Types.ObjectId): Promise<Event | EventMeta | null> {
    // Ceck Cache
    const eventMetaCacheKey = this.getEventMetaKey(eventId);
    const eventMeta = await this.cachingService.hgetall(eventMetaCacheKey);

    this.logger.assign({
      messages: [
        `Event Storage - Cache ${eventMeta !== null ? 'Hit' : 'Miss'} for event data.`,
      ],
    });

    if (eventMeta !== null) {
      return eventMeta as unknown as EventMeta;
    }

    // Check DataBase
    const event: Event | null = await this.eventModel.findById(eventId);

    if (!event) {
      this.logger.assign({
        messages: ['Event Storage - DB Miss - Event Not Existed in the DB'],
      });

      return event;
    }

    // Update Cache
    await this.cachingService.hset(eventMetaCacheKey, formatEventMeta(event));

    return event;
  }

  async setEventMeta(
    eventId: Types.ObjectId,
    event: EventDocument,
  ): Promise<void> {
    const meta: EventMeta = this.getEventMeta(event);

    await this.cachingService.hset(this.getEventMetaKey(eventId), meta);
  }

  async delEventMeta(eventId: Types.ObjectId): Promise<void> {
    await this.cachingService.del(this.getEventMetaKey(eventId));
  }

  getEventMeta(event: EventDocument): EventMeta {
    return {
      title: event.title,
      price: event.price,
      date: event.date,
      status: event.status,
      currency: event.currency,
      capacity: event.capacity,
    };
  }

  getEventMetaKey(eventId: Types.ObjectId | string): string {
    return CachingKeys.EVENT_META.replace('*', String(eventId));
  }
}
