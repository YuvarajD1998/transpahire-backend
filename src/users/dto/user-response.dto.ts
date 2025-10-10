// src/users/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Role, UserStatus } from '@prisma/client';

export class ProfileResponseDto {
  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty({ required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ required: false })
  @Expose()
  location?: string;
}

export class OrganizationResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  plan: string;
}

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ enum: Role })
  @Expose()
  role: Role;

  @ApiProperty({ enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiProperty({ required: false })
  @Expose()
  tenantId?: number;

  @ApiProperty()
  @Expose()
  verified: boolean;

  @ApiProperty()
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty({ type: ProfileResponseDto, required: false })
  @Expose()
  @Type(() => ProfileResponseDto)
  profile?: ProfileResponseDto;

  @ApiProperty({ type: OrganizationResponseDto, required: false })
  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  // Exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  emailVerificationToken?: string;

  @Exclude()
  passwordResetToken?: string;

  @Exclude()
  deletedAt?: Date;

  @Exclude()
  deletedBy?: number;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  @Expose()
  @Type(() => UserResponseDto)
  data: UserResponseDto[];

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  page: number;

  @ApiProperty()
  @Expose()
  limit: number;

  @ApiProperty()
  @Expose()
  totalPages: number;

  @ApiProperty()
  @Expose()
  hasNext: boolean;

  @ApiProperty()
  @Expose()
  hasPrev: boolean;
}
