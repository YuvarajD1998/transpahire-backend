// src/modules/profile/dto/profile.dto.ts
import { IsString, IsOptional, IsEmail, IsUrl, IsEnum, IsInt, Min, Max, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PrivacyMode, ProficiencyLevel, SkillSource } from '@prisma/client';

export class UpdateProfileDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Phone number', example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Location', example: 'New York, NY' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Professional headline', example: 'Senior Software Engineer' })
  @IsString()
  @IsOptional()
  headline?: string;

  @ApiProperty({ description: 'Professional bio/summary' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ description: 'LinkedIn profile URL' })
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @ApiProperty({ description: 'GitHub profile URL' })
  @IsUrl()
  @IsOptional()
  githubUrl?: string;

  @ApiProperty({ description: 'Personal website URL' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiProperty({ description: 'Privacy mode', enum: PrivacyMode })
  @IsEnum(PrivacyMode)
  @IsOptional()
  privacyMode?: PrivacyMode;
}

export class CreateProfileSkillDto {
  @ApiProperty({ description: 'Skill name', example: 'React.js' })
  @IsString()
  skillName: string;

  @ApiProperty({ description: 'Skill category', example: 'Frontend' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiencyLevel?: ProficiencyLevel;

  @ApiProperty({ description: 'Years of experience', example: 3 })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({ description: 'Skill source', enum: SkillSource, default: SkillSource.MANUAL })
  @IsEnum(SkillSource)
  @IsOptional()
  source?: SkillSource = SkillSource.MANUAL;
}

export class UpdateProfileSkillDto {
  @ApiProperty({ description: 'Skill category', example: 'Frontend' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  @IsOptional()
  proficiencyLevel?: ProficiencyLevel;

  @ApiProperty({ description: 'Years of experience', example: 3 })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({ description: 'Verification status' })
  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}

export class CreateWorkExperienceDto {
  @ApiProperty({ description: 'Company name', example: 'Google Inc.' })
  @IsString()
  company: string;

  @ApiProperty({ description: 'Job position', example: 'Senior Software Engineer' })
  @IsString()
  position: string;

  @ApiProperty({ description: 'Work location', example: 'Mountain View, CA' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Start date', example: '2022-01-01' })
  @Transform(({ value }) => value ? new Date(value) : null)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'End date', example: '2023-12-31' })
  @Transform(({ value }) => value ? new Date(value) : null)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ description: 'Currently working here', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean = false;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Key achievements', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];

  @ApiProperty({ description: 'Skills used in this role', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}

export class UpdateWorkExperienceDto extends CreateWorkExperienceDto {}

export class CreateEducationDto {
  @ApiProperty({ description: 'Institution name', example: 'Stanford University' })
  @IsString()
  institution: string;

  @ApiProperty({ description: 'Degree', example: 'Bachelor of Science' })
  @IsString()
  degree: string;

  @ApiProperty({ description: 'Field of study', example: 'Computer Science' })
  @IsString()
  @IsOptional()
  field?: string;

  @ApiProperty({ description: 'Start date', example: '2018-09-01' })
  @Transform(({ value }) => value ? new Date(value) : null)
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'End date', example: '2022-06-30' })
  @Transform(({ value }) => value ? new Date(value) : null)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ description: 'Grade/GPA', example: '3.8' })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiProperty({ description: 'Description/achievements' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEducationDto extends CreateEducationDto {}

export class ResumeUploadDto {
  @ApiProperty({ description: 'Set as primary resume', default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;

  @ApiProperty({ description: 'Enhanced image processing', default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  enhanceImages?: boolean = true;
}
