// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  providers: [UsersService, AuditService],
  controllers: [UsersController],
  exports: [UsersService], 
})
export class UsersModule {}
