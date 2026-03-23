import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConfig } from '../config/configurations/database.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (databaseConfig: DatabaseConfig) => ({
        uri: databaseConfig.uri,
      }),
      inject: [DatabaseConfig],
    }),
  ],
})
export class DatabaseModule {}
