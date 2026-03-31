import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { EventStorageService } from './event.storage';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from '../event/schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
  providers: [AvailabilityService, EventStorageService],
  exports: [AvailabilityService, EventStorageService],
})
export class AvailabilityModule {}
