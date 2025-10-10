import { getEnv, getEnvInt } from '../common/utils/env.helper';

export default () => ({
  port: getEnvInt('PORT', 3000),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Database
  database: {
    url: getEnv('DATABASE_URL'),
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvInt('DB_PORT', 5432),
    username: getEnv('DB_USERNAME', 'postgres'),
    password: getEnv('DB_PASSWORD'),
    name: getEnv('DB_NAME', 'transpahire_db'),
  },

  // JWT
  jwt: {
    secret: getEnv('JWT_SECRET'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '24h'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    issuer: getEnv('JWT_ISSUER', 'transpahire'),
    audience: getEnv('JWT_AUDIENCE', 'transpahire-users'),
  },

  // Redis
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvInt('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvInt('REDIS_DB', 0),
  },

  // Email
  email: {
    host: getEnv('SMTP_HOST'),
    port: getEnvInt('SMTP_PORT', 587),
    user: getEnv('SMTP_USER'),
    password: getEnv('SMTP_PASSWORD'),
    from: getEnv('SMTP_FROM', 'noreply@transpahire.com'),
  },

  // Frontend
  frontend: {
    url: getEnv('FRONTEND_URL', 'http://localhost:5173'),
  },

  // Security
  security: {
    bcryptRounds: getEnvInt('BCRYPT_ROUNDS', 12),
    maxSessionDays: getEnvInt('MAX_SESSION_DAYS', 90),
    refreshTokenDays: getEnvInt('REFRESH_TOKEN_DAYS', 7),
  },
});
