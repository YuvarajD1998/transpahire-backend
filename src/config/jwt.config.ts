import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  maxSessionDays: number;
  refreshTokenDays: number;
  issuer?: string;
  audience?: string;
}

export const jwtConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService): Promise<JwtConfig> => {
    // Validate required secrets exist
    const secret = configService.get<string>('JWT_SECRET');
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is required but not found in environment variables');
    }

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required but not found in environment variables');
    }

    return {
      secret,
      refreshSecret,
      expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '24h',
      refreshExpiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      maxSessionDays: parseInt(configService.get<string>('MAX_SESSION_DAYS') ?? '90'),
      refreshTokenDays: parseInt(configService.get<string>('REFRESH_TOKEN_DAYS') ?? '7'),
      issuer: configService.get<string>('JWT_ISSUER') ?? 'transpahire',
      audience: configService.get<string>('JWT_AUDIENCE') ?? 'transpahire-users',
    };
  },
  inject: [ConfigService],
};

// Helper function for services
export const getJwtConfig = (configService: ConfigService): JwtConfig => {
  const secret = configService.get<string>('JWT_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

  if (!secret) {
    throw new Error('JWT_SECRET is required but not found in environment variables');
  }

  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is required but not found in environment variables');
  }

  return {
    secret,
    refreshSecret,
    expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '24h',
    refreshExpiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    maxSessionDays: parseInt(configService.get<string>('MAX_SESSION_DAYS') ?? '90'),
    refreshTokenDays: parseInt(configService.get<string>('REFRESH_TOKEN_DAYS') ?? '7'),
    issuer: configService.get<string>('JWT_ISSUER') ?? 'transpahire',
    audience: configService.get<string>('JWT_AUDIENCE') ?? 'transpahire-users',
  };
};
