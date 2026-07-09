import * as Joi from 'joi';

/**
 * Validates process.env at boot. Missing/invalid required vars fail fast.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().allow('').default('*'),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  TICKET_HMAC_SECRET: Joi.string().min(16).required(),

  ORDER_HOLD_MINUTES: Joi.number().default(15),

  SEPAY_WEBHOOK_API_KEY: Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string()
    .allow('')
    .default('Event Ticketing <no-reply@example.com>'),
});
