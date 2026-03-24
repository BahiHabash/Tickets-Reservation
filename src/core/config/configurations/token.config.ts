import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import ms, { type StringValue } from 'ms';

@Injectable()
export class TokenConfig {
  private readonly _secret: string;
  private readonly _ttl: number;

  constructor(private readonly configService: ConfigService) {
    this._secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this._ttl = this.convertTTLToMilliseconds(
      this.configService.getOrThrow<StringValue>('JWT_ACCESS_TTL'),
    );
  }

  /**
   * JWT secret key
   */
  get secret(): string {
    return this._secret;
  }

  /**
   * Time to live in milliseconds
   */
  get ttl(): number {
    return this._ttl;
  }

  /**
   * Convert TTL to seconds (as expected by @nestjs/jwt signOptions)
   */
  private convertTTLToMilliseconds(ttl: StringValue): number {
    return ms(ttl);
  }
}
