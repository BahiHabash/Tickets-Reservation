import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  TokenConfig,
  TicketConfig,
} from './configurations';
import { envValidationSchema } from './env-validation.schema';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
  ],
  providers: [
    AppConfig,
    DatabaseConfig,
    RedisConfig,
    TokenConfig,
    TicketConfig,
  ],
  exports: [AppConfig, DatabaseConfig, RedisConfig, TokenConfig, TicketConfig],
})
export class AppConfigModule {}
