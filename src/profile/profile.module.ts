// src/modules/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { FileUploadService } from './services/file-upload.service';

@Module({
  imports: [
    // Remove PrismaModule since you use PrismaClient directly
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    ConfigModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, FileUploadService],
  exports: [ProfileService, FileUploadService],
})
export class ProfileModule {}
