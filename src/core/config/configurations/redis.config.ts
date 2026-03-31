import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import ms, { type StringValue } from 'ms';

@Injectable()
export class RedisConfig {
  private readonly _host: string;
  private readonly _port: number;
  private readonly _password: string;
  private readonly _eventMetaTtl: number;
  private readonly _idempotencyTtl: number;
  private readonly _ticketHoldingTtl: number;

  constructor(private readonly configService: ConfigService) {
    this._host = this.configService.getOrThrow<string>('REDIS_HOST');
    this._port = this.configService.getOrThrow<number>('REDIS_PORT');
    this._password = this.configService.getOrThrow<string>('REDIS_PASSWORD');
    this._eventMetaTtl = ms(
      this.configService.getOrThrow<StringValue>('EVENT_META_TTL'),
    );
    this._idempotencyTtl = ms(
      this.configService.getOrThrow<StringValue>('IDEMPOTENCY_TTL'),
    );
    this._ticketHoldingTtl = ms(
      this.configService.getOrThrow<StringValue>('TICKET_HOLDING_TTL'),
    );
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

  /**
   * Get event metadata TTL in milliseconds
   * @returns {number} Event metadata TTL in ms
   */
  get eventMetaTtl(): number {
    return this._eventMetaTtl;
  }

  /**
   * Get idempotency key TTL in milliseconds
   * @returns {number} Idempotency key TTL in ms
   */
  get idempotencyTtl(): number {
    return this._idempotencyTtl;
  }

  /**
   * Get ticket holding TTL in milliseconds
   * @returns {number} Ticket holding TTL in ms
   */
  get ticketHoldingTtl(): number {
    return this._ticketHoldingTtl;
  }
}
