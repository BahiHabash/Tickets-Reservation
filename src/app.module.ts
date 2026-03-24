import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { LoggerMiddleware } from './core/logger/logger.middleware';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';

@Module({
  imports: [CoreModule, UserModule, EventModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
