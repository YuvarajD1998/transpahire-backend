// src/users/dto/update-user.dto.ts
import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const)
) {
  @ApiProperty({
    example: 'Engineering',
    description: 'Department or team',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;
}
