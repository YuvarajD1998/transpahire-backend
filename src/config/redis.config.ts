// redis.config.ts
import { ConfigModule, ConfigService } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  connectTimeout?: number;
  commandTimeout?: number;
}

export const redisConfig = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    connection: {
      host: configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: parseInt(configService.get<string>('REDIS_PORT') ?? '6379'),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: parseInt(configService.get<string>('REDIS_DB') ?? '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  }),
  inject: [ConfigService],
};

// Export factory function for direct use
export const getRedisConfig = (configService: ConfigService): RedisConfig => ({
  host: configService.get<string>('REDIS_HOST') ?? 'localhost',
  port: parseInt(configService.get<string>('REDIS_PORT') ?? '6379'),
  password: configService.get<string>('REDIS_PASSWORD'),
  db: parseInt(configService.get<string>('REDIS_DB') ?? '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
});
