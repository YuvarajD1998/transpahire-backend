// src/users/dto/bulk-action.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, ArrayMinSize } from 'class-validator';
import { UserStatus } from '@prisma/client';

export enum BulkActionType {
  ACTIVATE = 'activate',
  SUSPEND = 'suspend',
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class BulkActionDto {
  @ApiProperty({
    description: 'Array of user IDs',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  userIds: number[];

  @ApiProperty({
    description: 'Action to perform',
    enum: BulkActionType,
    example: BulkActionType.ACTIVATE,
  })
  @IsEnum(BulkActionType)
  action: BulkActionType;
}

export class BulkActionResultDto {
  @ApiProperty({
    description: 'Number of successfully processed users',
    example: 2,
  })
  success: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 1,
  })
  failed: number;

  @ApiProperty({
    description: 'Details of failed operations',
    type: [Object],
    example: [{ userId: 3, error: 'User not found' }],
  })
  errors: Array<{ userId: number; error: string }>;
}
