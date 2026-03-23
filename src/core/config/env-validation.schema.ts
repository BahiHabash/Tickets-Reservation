import Joi from 'joi';
import { NodeEnv } from '../../common/enums/node-env.enum';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid(...Object.values(NodeEnv))
    .default(NodeEnv.DEVELOPMENT),
  PORT: Joi.number().default(3000),
  BASE_URL: Joi.string().uri().default('http://localhost'),
  API_VERSION: Joi.string().default('api/v1'),

  // Logging
  LOG_P99_THRESHOLD_MS: Joi.number().default(1000),
  LOG_SAMPLING_RATE: Joi.number().default(0.03),

  // Database
  MONGO_URI: Joi.string().required().messages({
    'any.required':
      'MONGO_URI is required — provide a MongoDB connection string',
  }),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // Ticket reservation
  TICKET_HOLDING_TTL: Joi.string().default('10m'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().required().messages({
    'any.required': 'JWT_SECRET is required — provide a secret key',
  }),
  JWT_EXPIRATION: Joi.string().default('1h'),
});
