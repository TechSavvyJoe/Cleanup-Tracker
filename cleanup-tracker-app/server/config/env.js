const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  MONGO_URI: z.string().trim().min(1).optional(),
  JWT_SECRET: z.string().trim().min(10).optional(),
  JWT_ACCESS_SECRET: z.string().trim().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().trim().min(16).optional(),
  JWT_ACCESS_EXPIRATION: z.string().trim().optional(),
  JWT_REFRESH_EXPIRATION: z.string().trim().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  UPLOAD_LIMIT: z.string().trim().optional(),
  FRONTEND_URL: z.string().trim().optional(),
  LOG_LEVEL: z.string().trim().optional(),
  PIN_MIN_LENGTH: z.coerce.number().int().optional(),
  PIN_MAX_LENGTH: z.coerce.number().int().optional(),
  AUTH_LOCK_MAX_ATTEMPTS: z.coerce.number().int().optional(),
  AUTH_LOCK_WINDOW_MINUTES: z.coerce.number().int().optional(),
  AUTH_LOCK_DURATION_MINUTES: z.coerce.number().int().optional()
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  // eslint-disable-next-line no-console
  console.error('Environment validation failed:', parseResult.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const env = parseResult.data;
const isProduction = env.NODE_ENV === 'production';
const isDevelopment = env.NODE_ENV === 'development';

const config = {
  nodeEnv: env.NODE_ENV,
  isProduction,
  isDevelopment,
  isTest: env.NODE_ENV === 'test',
  port: env.PORT || 5051,
  mongoUri: env.MONGO_URI || 'mongodb://localhost:27017/cleanup-tracker',
  jwtLegacySecret: env.JWT_SECRET || null,
  jwtAccessSecret: env.JWT_ACCESS_SECRET || (isProduction ? null : 'development-access-secret'),
  jwtRefreshSecret: env.JWT_REFRESH_SECRET || (isProduction ? null : 'development-refresh-secret'),
  jwtAccessExpiration: env.JWT_ACCESS_EXPIRATION || '15m',
  jwtRefreshExpiration: env.JWT_REFRESH_EXPIRATION || '7d',
  rateLimitMax: env.RATE_LIMIT_MAX ?? (isProduction ? 100 : 1000),
  authRateLimitMax: env.AUTH_RATE_LIMIT_MAX ?? (isProduction ? 5 : 50),
  uploadLimit: env.UPLOAD_LIMIT || '10mb',
  frontendUrls: env.FRONTEND_URL
    ? env.FRONTEND_URL.split(',').map((url) => url.trim()).filter(Boolean)
    : null,
  logLevel: env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')
};

if (isProduction) {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGO_URI');
  if (!config.jwtAccessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!config.jwtRefreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (!config.jwtLegacySecret) missing.push('JWT_SECRET');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

module.exports = config;
