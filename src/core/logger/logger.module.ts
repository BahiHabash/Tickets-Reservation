import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WideEventLog, WideEventLogSchema } from './wide-event.schema';
import { WideEventLoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WideEventLog.name, schema: WideEventLogSchema },
    ]),
  ],
  providers: [WideEventLoggerService],
  exports: [WideEventLoggerService],
})
export class LoggerModule {}
