// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enum'; 

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
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
    example: 'CANDIDATE',
    description: 'User role - only CANDIDATE or RECRUITER allowed',
    enum: [Role.CANDIDATE, Role.RECRUITER],
    required: false,
  })
  @IsOptional()
  @IsEnum([Role.CANDIDATE, Role.RECRUITER], {
    message: 'Role must be either CANDIDATE or RECRUITER. For organization users, use the organization registration endpoint.',
  })
  role?: Role.CANDIDATE | Role.RECRUITER;

  @ApiProperty({
    example: 'John',
    description: 'First name',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
