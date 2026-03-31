import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Booking } from './schemas/booking.schema';
import { Ticket } from './schemas/ticket.schema';
import { Event } from '../event/schemas/event.schema';
import { BookingStatus } from './enums/booking-status.enum';
import { CachingService } from '../../core/caching';
import { TicketConfig } from '../../core/config/configurations/ticket.config';
import { AvailabilityService } from '../availability/availability.service';
import { LoggingService } from '../../core/logging';
import { Types } from 'mongoose';

describe('BookingService', () => {
  let service: BookingService;
  let bookingModel: any;
  let cachingService: any;
  let availabilityService: any;

  const mockEventMeta = {
    title: 'Test Event',
    price: 100,
    date: new Date(Date.now() + 86400000).toISOString(),
    status: 'published',
    capacity: 10,
    availableTickets: 5,
    currency: 'usd',
  };

  beforeEach(async () => {
    bookingModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
    };

    cachingService = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    };

    availabilityService = {
      availableSlotsCount: jest.fn(),
      checkAndHold: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getModelToken(Booking.name),
          useValue: bookingModel,
        },
        {
          provide: getModelToken(Ticket.name),
          useValue: { insertMany: jest.fn() },
        },
        {
          provide: getModelToken(Event.name),
          useValue: { findOneAndUpdate: jest.fn() },
        },
        {
          provide: getQueueToken('booking-expiry'),
          useValue: { add: jest.fn() },
        },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn() },
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
          provide: TicketConfig,
          useValue: { ticketHoldingTtl: 600000 },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  describe('createBooking', () => {
    const userId = new Types.ObjectId().toString();
    const eventId = new Types.ObjectId().toString();
    const idemKey = 'idem-123';

    it('should create a booking successfully (Happy Path)', async () => {
      cachingService.get.mockImplementation((key: string) => {
        if (key.includes('idempotency')) return Promise.resolve(null);
        if (key.includes('meta'))
          return Promise.resolve(JSON.stringify(mockEventMeta));
        return Promise.resolve(null);
      });
      cachingService.acquireLock.mockResolvedValue(true);
      bookingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      availabilityService.availableSlotsCount.mockResolvedValue(5);
      bookingModel.create.mockImplementation((data: any) =>
        Promise.resolve({
          ...data,
          _id: new Types.ObjectId().toString(),
          toJSON: jest.fn().mockReturnValue(data),
        }),
      );

      const result = await service.createBooking(userId, eventId, 2, idemKey);

      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.quantity).toBe(2);
      expect(availabilityService.checkAndHold).toHaveBeenCalled();
      expect(cachingService.releaseLock).toHaveBeenCalled();
    });

    it('should return cached booking if found in Redis (Idempotent Hit)', async () => {
      const cached = { _id: 'cached-id', status: 'pending', toJSON: jest.fn() };
      cachingService.get.mockReturnValue(
        Promise.resolve(JSON.stringify(cached)),
      );

      const result = await service.createBooking(userId, eventId, 2, idemKey);

      expect(result._id).toBe('cached-id');
      expect(cachingService.acquireLock).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if lock is busy (Concurrent requests)', async () => {
      cachingService.get.mockReturnValue(Promise.resolve(null));
      cachingService.acquireLock.mockResolvedValue(false);

      await expect(
        service.createBooking(userId, eventId, 2, idemKey),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if capacity is insufficient', async () => {
      cachingService.get.mockImplementation((key: string) => {
        if (key.includes('meta'))
          return Promise.resolve(JSON.stringify(mockEventMeta));
        return Promise.resolve(null);
      });
      cachingService.acquireLock.mockResolvedValue(true);
      bookingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      availabilityService.availableSlotsCount.mockResolvedValue(1); // Only 1 left, user wants 2

      await expect(
        service.createBooking(userId, eventId, 2, idemKey),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
