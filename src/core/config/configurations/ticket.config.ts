import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms, { type StringValue } from 'ms';

@Injectable()
export class TicketConfig {
  private readonly _ticketHoldingTtl: number;

  constructor(private readonly configService: ConfigService) {
    this._ticketHoldingTtl = ms(
      this.configService.getOrThrow<StringValue>('TICKET_HOLDING_TTL'),
    );
  }

  /**
   * Get ticket holding TTL in milliseconds
   * @returns {number} Ticket holding TTL in milliseconds
   */
  get ticketHoldingTtl(): number {
    return this._ticketHoldingTtl;
  }

  /**
   * Convert ticket holding TTL to milliseconds
   * @returns {number} Ticket holding TTL in milliseconds
   */
  convertTicketHoldingTtlToMs(ttl: StringValue): number {
    return ms(ttl);
  }
}
