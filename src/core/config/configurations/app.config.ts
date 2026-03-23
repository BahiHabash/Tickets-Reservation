import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { NodeEnv } from '../../../common/enums/node-env.enum';

@Injectable()
export class AppConfig {
  private readonly _nodeEnv: NodeEnv;
  private readonly _port: number;
  private readonly _baseUrl: string;
  private readonly _apiVersion: string;
  private readonly _logP99ThresholdMs: number;
  private readonly _logSamplingRate: number;

  constructor(private readonly configService: ConfigService) {
    this._nodeEnv = this.configService.getOrThrow<NodeEnv>('NODE_ENV');
    this._port = this.configService.getOrThrow<number>('PORT');
    this._baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    this._apiVersion = this.configService.getOrThrow<string>('API_VERSION');
    this._logP99ThresholdMs = this.configService.getOrThrow<number>(
      'LOG_P99_THRESHOLD_MS',
    );
    this._logSamplingRate =
      this.configService.getOrThrow<number>('LOG_SAMPLING_RATE');
  }

  get isDevelopment(): boolean {
    return this._nodeEnv === NodeEnv.DEVELOPMENT;
  }

  get isProduction(): boolean {
    return this._nodeEnv === NodeEnv.PRODUCTION;
  }

  get isTest(): boolean {
    return this._nodeEnv === NodeEnv.TEST;
  }

  get nodeEnv(): NodeEnv {
    return this._nodeEnv;
  }

  get port(): number {
    return this._port;
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  get apiVersion(): string {
    return this._apiVersion;
  }

  get apiUrl(): string {
    return `${this.baseUrl}:${this.port}/${this.apiVersion}`;
  }

  get logP99ThresholdMs(): number {
    return this._logP99ThresholdMs;
  }

  get logSamplingRate(): number {
    return this._logSamplingRate;
  }
}
