import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Booking } from '../booking/schemas/booking.schema';
import { BookingStatus } from '../booking/enums/booking-status.enum';
import { LoggingService } from '../../core/logging';
import { Types } from 'mongoose';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let bookingModel: any;
  let eventEmitter: any;

  beforeEach(async () => {
    bookingModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(Booking.name),
          useValue: bookingModel,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: LoggingService,
          useValue: { assign: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('processPayment', () => {
    const bookingId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should process payment and emit success event (Happy Path)', async () => {
      const mockBooking = {
        _id: bookingId,
        status: BookingStatus.PENDING,
        user: userId,
      };
      bookingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBooking),
      });

      const result = await service.processPayment(bookingId, userId);

      expect(result.success).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', {
        bookingId,
      });
    });

    it('should throw NotFoundException if booking is not pending or not owned', async () => {
      bookingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      bookingModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: bookingId,
          status: BookingStatus.CONFIRMED,
        }),
      }); // already confirmed

      await expect(service.processPayment(bookingId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
