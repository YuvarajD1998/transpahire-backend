import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import * as winston from 'winston';
import * as path from 'path';
import { redisConfig } from './config/redis.config';
import configuration from './config/configuration';



import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {ProfileModule} from './profile/profile.module'
// import { UsersModule } from './users/users.module';
// import { OrganizationsModule } from './organizations/organizations.module';
// import { SubscriptionsModule } from './subscriptions/subscriptions.module';
// import { JobsModule } from './jobs/jobs.module';
// import { ApplicationsModule } from './applications/applications.module';
// import { ProfilesModule } from './profiles/profiles.module';
// import { MessagingModule } from './messaging/messaging.module';
// import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    // Configuration
      ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration], 
      envFilePath: ['.env.local', '.env'],
      cache: true, 
    }),

    // Throttling
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Redis and BullMQ - FIXED
    BullModule.forRootAsync(redisConfig),

    // Logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        }),
      ],
    }),

    // Internationalization
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/locales'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),

    // Core modules
    AuthModule,
    ProfileModule,
    // UsersModule,
    // OrganizationsModule,
    // SubscriptionsModule,
    // JobsModule,
    // ApplicationsModule,
    // ProfilesModule,
    // MessagingModule,
    // QueuesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
