import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from './schemas/event.schema';
import { EventStatus } from './enums/event-status.enum';
import { CachingService } from '../../core/caching';
import { AvailabilityService } from '../availability/availability.service';
import { LoggingService } from '../../core/logging';

describe('EventService', () => {
  let service: EventService;
  let eventModel: any;
  let cachingService: any;
  let availabilityService: any;
  let eventEmitter: any;

  const mockEvent = {
    _id: '69c8d0f1a9f9ff71e03faf32',
    title: 'Test Event',
    price: 100,
    status: EventStatus.DRAFT,
    capacity: 10,
    availableTickets: 10,
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    eventModel = {
      findById: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    cachingService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    availabilityService = {
      initializeEventSlots: jest.fn(),
      deleteEventSlots: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getModelToken(Event.name),
          useValue: eventModel,
        },
        {
          provide: CachingService,
          useValue: cachingService,
        },
        {
          provide: AvailabilityService,
          useValue: availabilityService,
        },
        {
          provide: LoggingService,
          useValue: { assign: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishEvent', () => {
    it('should publish a draft event successfully', async () => {
      const draftEvent = { ...mockEvent, status: EventStatus.DRAFT, save: jest.fn().mockResolvedValue({ ...mockEvent, status: EventStatus.PUBLISHED }) };
      eventModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(draftEvent) });
      
      const result = await service.publishEvent(mockEvent._id);

      expect(draftEvent.status).toBe(EventStatus.PUBLISHED);
      expect(draftEvent.save).toHaveBeenCalled();
      expect(availabilityService.initializeEventSlots).toHaveBeenCalledWith(mockEvent._id, 10);
      expect(cachingService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event does not exist', async () => {
      eventModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.publishEvent('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if event is not in DRAFT status', async () => {
      const publishedEvent = { ...mockEvent, status: EventStatus.PUBLISHED };
      eventModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(publishedEvent) });
      await expect(service.publishEvent(mockEvent._id)).rejects.toThrow(ConflictException);
    });
  });

  describe('create', () => {
    it('should create an event in draft status', async () => {
      const dto = { title: 'New Event', price: 50, capacity: 100, date: new Date().toISOString(), location: 'Location' };
      eventModel.create.mockResolvedValue({ ...dto, _id: 'new-id', status: EventStatus.DRAFT, availableTickets: 100 });
      
      const result = await service.create(dto as any);
      
      expect(result.status).toBe(EventStatus.DRAFT);
      expect(result.availableTickets).toBe(dto.capacity);
    });
  });
});
