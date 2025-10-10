// src/modules/profile/dto/response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PrivacyMode, ProficiencyLevel, SkillSource, ParseStatus } from '@prisma/client';

export class ProfileResponseDto {
  @ApiProperty({ description: 'Profile ID' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Phone number' })
  phone?: string;

  @ApiProperty({ description: 'Location' })
  location?: string;

  @ApiProperty({ description: 'Professional headline' })
  headline?: string;

  @ApiProperty({ description: 'Professional bio' })
  bio?: string;

  @ApiProperty({ description: 'Profile photo URL' })
  profilePhotoUrl?: string;

  @ApiProperty({ description: 'LinkedIn profile URL' })
  linkedinUrl?: string;

  @ApiProperty({ description: 'GitHub profile URL' })
  githubUrl?: string;

  @ApiProperty({ description: 'Personal website URL' })
  websiteUrl?: string;

  @ApiProperty({ description: 'Profile completeness percentage' })
  profileCompleteness: number;

  @ApiProperty({ description: 'Privacy mode', enum: PrivacyMode })
  privacyMode: PrivacyMode;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class ProfileSkillResponseDto {
  @ApiProperty({ description: 'Skill ID' })
  id: number;

  @ApiProperty({ description: 'Skill name' })
  skillName: string;

  @ApiProperty({ description: 'Skill category' })
  category?: string;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  proficiencyLevel?: ProficiencyLevel;

  @ApiProperty({ description: 'Years of experience' })
  yearsExperience?: number;

  @ApiProperty({ description: 'Skill source', enum: SkillSource })
  source: SkillSource;

  @ApiProperty({ description: 'Verification status' })
  verified: boolean;
}

export class WorkExperienceResponseDto {
  @ApiProperty({ description: 'Experience ID' })
  id: number;

  @ApiProperty({ description: 'Company name' })
  company: string;

  @ApiProperty({ description: 'Job position' })
  position: string;

  @ApiProperty({ description: 'Work location' })
  location?: string;

  @ApiProperty({ description: 'Start date' })
  startDate?: Date;

  @ApiProperty({ description: 'End date' })
  endDate?: Date;

  @ApiProperty({ description: 'Currently working here' })
  isCurrent: boolean;

  @ApiProperty({ description: 'Job description' })
  description?: string;

  @ApiProperty({ description: 'Key achievements' })
  achievements?: string[];

  @ApiProperty({ description: 'Skills used in this role' })
  skills?: string[];
}

export class EducationResponseDto {
  @ApiProperty({ description: 'Education ID' })
  id: number;

  @ApiProperty({ description: 'Institution name' })
  institution: string;

  @ApiProperty({ description: 'Degree' })
  degree: string;

  @ApiProperty({ description: 'Field of study' })
  field?: string;

  @ApiProperty({ description: 'Start date' })
  startDate?: Date;

  @ApiProperty({ description: 'End date' })
  endDate?: Date;

  @ApiProperty({ description: 'Grade/GPA' })
  grade?: string;

  @ApiProperty({ description: 'Description/achievements' })
  description?: string;
}
export interface ParsedResumeData {
  skills?: Array<string | { name?: string; skillName?: string; [key: string]: any }>;
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    [key: string]: any;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export class ResumeResponseDto {
  @ApiProperty({ description: 'Resume ID' })
  id: number;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Original name' })
  originalName: string;

  @ApiProperty({ description: 'File path/URL' })
  filePath: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'MIME type' })
  mimetype: string;

  @ApiProperty({ description: 'Parse status', enum: ParseStatus })
  parseStatus: ParseStatus;

  @ApiProperty({ description: 'Confidence score' })
  confidenceScore?: number;

  @ApiProperty({ description: 'Primary resume flag' })
  isPrimary: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Parsed resume data - contains skills, experience, and education information',
    example: {
      skills: ['React.js', 'TypeScript', 'Node.js'],
      experience: [{ company: 'Tech Corp', position: 'Senior Developer' }],
      education: [{ institution: 'University', degree: 'Computer Science' }]
    }
  })
  parsedData?: ParsedResumeData;
}


export class CompleteProfileDataResponseDto {
  @ApiProperty({ description: 'Profile data' })
  profile: ProfileResponseDto;

  @ApiProperty({ description: 'Work experiences', type: [WorkExperienceResponseDto] })
  workExperiences: WorkExperienceResponseDto[];

  @ApiProperty({ description: 'Education records', type: [EducationResponseDto] })
  educations: EducationResponseDto[];

  @ApiProperty({ description: 'Skills', type: [ProfileSkillResponseDto] })
  skills: ProfileSkillResponseDto[];

  @ApiProperty({ description: 'Resumes', type: [ResumeResponseDto] })
  resumes: ResumeResponseDto[];
}


