import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { LoggingMiddleware } from './core/logging/logging.middleware';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [CoreModule, UserModule, EventModule, BookingModule, PaymentsModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
