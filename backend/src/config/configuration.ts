/**
 * Typed config loader. Defaults mirror env.validation.ts so values are safe
 * even if Joi defaults are not written back to process.env.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? '*',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    // Scanner devices hold their token for a whole event cycle; revocation is
    // instant anyway because role/status is read from the DB per request.
    scannerExpiresIn: process.env.SCANNER_JWT_EXPIRES_IN ?? '30d',
  },
  ticket: {
    hmacSecret: process.env.TICKET_HMAC_SECRET,
  },
  order: {
    holdMinutes: parseInt(process.env.ORDER_HOLD_MINUTES ?? '15', 10),
  },
  sepay: {
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY ?? '',
    bank: process.env.SEPAY_BANK ?? '',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? '',
  },
  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'Event Ticketing <no-reply@example.com>',
  },
});
