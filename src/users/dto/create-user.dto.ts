// src/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsString, 
  MinLength, 
  IsOptional, 
  IsEnum,
  IsNumber,
  ValidateIf,
  IsNotEmpty
} from 'class-validator';
import { Role, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'User password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: Role.ORG_RECRUITER,
    description: 'User role',
    enum: Role,
    required: false,
    default: Role.CANDIDATE,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: UserStatus.ACTIVE,
    description: 'User status',
    enum: UserStatus,
    required: false,
    default: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    example: 1,
    description: 'Organization ID (required for org users)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @ValidateIf((obj) => obj.role !== Role.CANDIDATE && obj.role !== Role.PLATFORM_ADMIN)
  tenantId?: number;

  @ApiProperty({
    example: 'John',
    description: 'First name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiProperty({
    example: '+1-555-0123',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
