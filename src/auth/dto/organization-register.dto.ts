// src/auth/dto/organization-register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { OrgPlan } from '@prisma/client';

export class OrganizationRegisterDto {
  // Organization details
  @ApiProperty({
    example: 'TechCorp Solutions',
    description: 'Organization name',
  })
  @IsString()
  @MinLength(2)
  organizationName: string;

  @ApiProperty({
    example: 'ORG_BASIC',
    description: 'Organization plan',
    enum: OrgPlan,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrgPlan)
  organizationPlan?: OrgPlan;

  // Admin user details
  @ApiProperty({
    example: 'admin@techcorp.com',
    description: 'Organization admin email address',
  })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Admin user password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiProperty({
    example: 'John',
    description: 'Admin first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminFirstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Admin last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminLastName?: string;
}
