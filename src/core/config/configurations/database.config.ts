import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseConfig {
  private readonly _uri: string;

  constructor(private readonly configService: ConfigService) {
    this._uri = this.configService.getOrThrow<string>('MONGO_URI');
  }

  get uri(): string {
    return this._uri;
  }
}
