import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisConfig {
  private readonly _host: string;
  private readonly _port: number;
  private readonly _password: string;

  constructor(private readonly configService: ConfigService) {
    this._host = this.configService.getOrThrow<string>('REDIS_HOST');
    this._port = this.configService.getOrThrow<number>('REDIS_PORT');
    this._password = this.configService.getOrThrow<string>('REDIS_PASSWORD');
  }

  get host(): string {
    return this._host;
  }

  get port(): number {
    return this._port;
  }

  get password(): string {
    return this._password;
  }
}
