// src/modules/profile/services/profile.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, OnModuleDestroy, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient, Role, ParseStatus, PrivacyMode, SkillSource } from '@prisma/client';
import { FileUploadService } from './file-upload.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { FileType } from '../../common/enums';
import {
  UpdateProfileDto,
  CreateProfileSkillDto,
  UpdateProfileSkillDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  CreateEducationDto,
  UpdateEducationDto,
  ResumeUploadDto,
} from '../dto/profile.dto';
import {
  ProfileResponseDto,
  ProfileSkillResponseDto,
  WorkExperienceResponseDto,
  EducationResponseDto,
  ResumeResponseDto,
  CompleteProfileDataResponseDto,
  ParsedResumeData,
} from '../dto/response.dto';

@Injectable()
export class ProfileService implements OnModuleDestroy {
  private readonly logger = new Logger(ProfileService.name);
  private readonly prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  private readonly fastApiBaseUrl: string;

  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.fastApiBaseUrl = this.configService.get<string>('FASTAPI_BASE_URL', 'http://localhost:8000');
  }

  // Profile Management
  async getProfile(userId: number): Promise<ProfileResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapToProfileResponse(profile);
  }

  async updateProfile(userId: number, updateData: UpdateProfileDto): Promise<ProfileResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // Calculate and update profile completeness
    const completeness = this.calculateProfileCompleteness(updatedProfile);
    if (completeness !== updatedProfile.profileCompleteness) {
      await this.prisma.profile.update({
        where: { userId },
        data: { profileCompleteness: completeness },
      });
      updatedProfile.profileCompleteness = completeness;
    }

    this.logger.log(`Profile updated for user ${userId}`);
    return this.mapToProfileResponse(updatedProfile);
  }

  async uploadProfilePhoto(userId: number, file: Express.Multer.File): Promise<{ photoUrl: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete old profile photo if exists
    if (profile.profilePhotoUrl) {
      try {
        const oldFileName = profile.profilePhotoUrl.split('/').pop();
        if (oldFileName) { // Fix: check if filename exists
          await this.fileUploadService.deleteFile(oldFileName, FileType.PROFILE_PHOTO);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete old profile photo: ${error.message}`);
      }
    }

    const fileName = await this.fileUploadService.uploadProfilePhoto(file, userId);
    const photoUrl = await this.fileUploadService.getFileUrl(fileName, FileType.PROFILE_PHOTO);

    await this.prisma.profile.update({
      where: { userId },
      data: {
        profilePhotoUrl: photoUrl,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Profile photo updated for user ${userId}`);
    return { photoUrl };
  }


  async deleteProfilePhoto(userId: number): Promise<{ message: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.profilePhotoUrl) {
      throw new NotFoundException('Profile photo not found');
    }

    const fileName = profile.profilePhotoUrl.split('/').pop();

    // Fix: Check if fileName exists before using it
    if (!fileName) {
      throw new BadRequestException('Invalid profile photo URL format');
    }

    await this.fileUploadService.deleteFile(fileName, FileType.PROFILE_PHOTO);

    await this.prisma.profile.update({
      where: { userId },
      data: {
        profilePhotoUrl: null,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Profile photo deleted for user ${userId}`);
    return { message: 'Profile photo deleted successfully' };
  }




  // Skills Management
  async getSkills(userId: number): Promise<ProfileSkillResponseDto[]> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const skills = await this.prisma.profileSkill.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { category: 'asc' },
        { skillName: 'asc' }
      ],
    });

    return skills.map(this.mapToSkillResponse);
  }

  private async getFilteredSkills(userId: number, primaryResumeId?: number): Promise<ProfileSkillResponseDto[]> {
  const profile = await this.getProfileByUserId(userId);
  
  const whereClause = {
    profileId: profile.id,
    OR: [
      { source: SkillSource.MANUAL }, // Always include manual skills
      ...(primaryResumeId ? [{
        // Include skills from primary resume
        AND: [
          { source: { in: [SkillSource.AI_EXTRACTED, SkillSource.VERIFIED] } },
          // Match skills by checking if they exist in primary resume's parsed data
          { 
            skillName: { 
              in: await this.getPrimaryResumeSkills(primaryResumeId) 
            } 
          }
        ]
      }] : [])
    ]
  };

  const skills = await this.prisma.profileSkill.findMany({
    where: whereClause,
    orderBy: [{ category: 'asc' }, { skillName: 'asc' }]
  });
  
  return skills.map(this.mapToSkillResponse);
}

private async getFilteredWorkExperiences(userId: number, primaryResumeId?: number): Promise<WorkExperienceResponseDto[]> {
  const profile = await this.getProfileByUserId(userId);
  
  const whereClause = {
    profileId: profile.id,
    OR: [
      { source: 'MANUAL' }, // Manual experiences
      ...(primaryResumeId ? [{ resumeId: primaryResumeId }] : []) // Primary resume experiences  
    ]
  };

  const experiences = await this.prisma.workExperience.findMany({
    where: whereClause,
    orderBy: [{ isCurrent: 'desc' }, { startDate: { sort: 'desc', nulls: 'last' } }]
  });
  
  return experiences.map(this.mapToWorkExperienceResponse);
}

private async getFilteredEducations(userId: number, primaryResumeId?: number): Promise<EducationResponseDto[]> {
  const profile = await this.getProfileByUserId(userId);
  
  const whereClause = {
    profileId: profile.id,
    OR: [
      { source: 'MANUAL' }, // Manual education
      ...(primaryResumeId ? [{ resumeId: primaryResumeId }] : []) // Primary resume education
    ]
  };

  const educations = await this.prisma.education.findMany({
    where: whereClause,
    orderBy: [{ startDate: { sort: 'desc', nulls: 'last' } }]
  });
  
  return educations.map(this.mapToEducationResponse);
}

private async getPrimaryResumeSkills(resumeId: number): Promise<string[]> {
  const resume = await this.prisma.resume.findUnique({
    where: { id: resumeId },
    select: { parsedData: true }
  });
  
  // Type assertion with proper interface
  const parsedData = resume?.parsedData as ParsedResumeData | null;
  
  // Safe property access with type checking
  if (!parsedData || !parsedData.skills || !Array.isArray(parsedData.skills)) {
    return [];
  }
  
  return parsedData.skills.map((skill: any) => {
    if (typeof skill === 'string') {
      return skill;
    }
    if (typeof skill === 'object' && skill !== null) {
      return skill.name || skill.skillName || skill.skill || '';
    }
    return '';
  }).filter(Boolean); // Remove empty strings
}


  async createSkill(userId: number, skillData: CreateProfileSkillDto): Promise<ProfileSkillResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);

    // Check if skill already exists
    const existingSkill = await this.prisma.profileSkill.findUnique({
      where: {
        profileId_skillName: {
          profileId: profile.id,
          skillName: skillData.skillName,
        },
      },
    });

    if (existingSkill) {
      throw new BadRequestException('Skill already exists');
    }

    const skill = await this.prisma.profileSkill.create({
      data: {
        profileId: profile.id,
        skillName: skillData.skillName,
        category: skillData.category,
        proficiencyLevel: skillData.proficiencyLevel,
        yearsExperience: skillData.yearsExperience,
        source: skillData.source || SkillSource.MANUAL,
        verified: false,
      },
    });

    this.logger.log(`Skill created for user ${userId}: ${skillData.skillName}`);
    return this.mapToSkillResponse(skill);
  }

  async updateSkill(userId: number, skillId: number, updateData: UpdateProfileSkillDto): Promise<ProfileSkillResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const skill = await this.prisma.profileSkill.findFirst({
      where: { id: skillId, profileId: profile.id },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const updatedSkill = await this.prisma.profileSkill.update({
      where: { id: skillId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Skill updated for user ${userId}: ${skill.skillName}`);
    return this.mapToSkillResponse(updatedSkill);
  }

  async deleteSkill(userId: number, skillId: number): Promise<{ message: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const skill = await this.prisma.profileSkill.findFirst({
      where: { id: skillId, profileId: profile.id },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    await this.prisma.profileSkill.delete({
      where: { id: skillId },
    });

    this.logger.log(`Skill deleted for user ${userId}: ${skill.skillName}`);
    return { message: 'Skill deleted successfully' };
  }

  // Work Experience Management
  async getWorkExperiences(userId: number): Promise<WorkExperienceResponseDto[]> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const experiences = await this.prisma.workExperience.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { isCurrent: 'desc' },
        { startDate: { sort: 'desc', nulls: 'last' } },
      ],
    });

    return experiences.map(this.mapToWorkExperienceResponse);
  }

  async createWorkExperience(userId: number, experienceData: CreateWorkExperienceDto): Promise<WorkExperienceResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);

    // If this is set as current, update other experiences to not be current
    if (experienceData.isCurrent) {
      await this.prisma.workExperience.updateMany({
        where: { profileId: profile.id, isCurrent: true },
        data: { isCurrent: false, updatedAt: new Date() },
      });
    }

    const experience = await this.prisma.workExperience.create({
      data: {
        profileId: profile.id,
        source: 'MANUAL', 
        resumeId: null, 
        company: experienceData.company,
        position: experienceData.position,
        location: experienceData.location,
        startDate: experienceData.startDate,
        endDate: experienceData.endDate,
        isCurrent: experienceData.isCurrent || false,
        description: experienceData.description,
        achievements: experienceData.achievements || [],
        skills: experienceData.skills || [],
      },
    });

    this.logger.log(`Work experience created for user ${userId}: ${experienceData.company}`);
    return this.mapToWorkExperienceResponse(experience);
  }

  async updateWorkExperience(userId: number, experienceId: number, updateData: UpdateWorkExperienceDto): Promise<WorkExperienceResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const experience = await this.prisma.workExperience.findFirst({
      where: { id: experienceId, profileId: profile.id },
    });

    if (!experience) {
      throw new NotFoundException('Work experience not found');
    }

    // If this is set as current, update other experiences to not be current
    if (updateData.isCurrent) {
      await this.prisma.workExperience.updateMany({
        where: { profileId: profile.id, isCurrent: true, id: { not: experienceId } },
        data: { isCurrent: false, updatedAt: new Date() },
      });
    }

    const updatedExperience = await this.prisma.workExperience.update({
      where: { id: experienceId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Work experience updated for user ${userId}: ${experience.company}`);
    return this.mapToWorkExperienceResponse(updatedExperience);
  }

  async deleteWorkExperience(userId: number, experienceId: number): Promise<{ message: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const experience = await this.prisma.workExperience.findFirst({
      where: { id: experienceId, profileId: profile.id },
    });

    if (!experience) {
      throw new NotFoundException('Work experience not found');
    }

    await this.prisma.workExperience.delete({
      where: { id: experienceId },
    });

    this.logger.log(`Work experience deleted for user ${userId}: ${experience.company}`);
    return { message: 'Work experience deleted successfully' };
  }

  // Education Management
  async getEducations(userId: number): Promise<EducationResponseDto[]> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const educations = await this.prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: { sort: 'desc', nulls: 'last' } },
    });

    return educations.map(this.mapToEducationResponse);
  }

  async createEducation(userId: number, educationData: CreateEducationDto): Promise<EducationResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);

    const education = await this.prisma.education.create({
      data: {
        profileId: profile.id,
        source: 'MANUAL', 
        resumeId: null,
        institution: educationData.institution,
        degree: educationData.degree,
        field: educationData.field,
        startDate: educationData.startDate,
        endDate: educationData.endDate,
        grade: educationData.grade,
        description: educationData.description,
      },
    });

    this.logger.log(`Education created for user ${userId}: ${educationData.institution}`);
    return this.mapToEducationResponse(education);
  }

  async updateEducation(userId: number, educationId: number, updateData: UpdateEducationDto): Promise<EducationResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const education = await this.prisma.education.findFirst({
      where: { id: educationId, profileId: profile.id },
    });

    if (!education) {
      throw new NotFoundException('Education record not found');
    }

    const updatedEducation = await this.prisma.education.update({
      where: { id: educationId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Education updated for user ${userId}: ${education.institution}`);
    return this.mapToEducationResponse(updatedEducation);
  }

  async deleteEducation(userId: number, educationId: number): Promise<{ message: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const education = await this.prisma.education.findFirst({
      where: { id: educationId, profileId: profile.id },
    });

    if (!education) {
      throw new NotFoundException('Education record not found');
    }

    await this.prisma.education.delete({
      where: { id: educationId },
    });

    this.logger.log(`Education deleted for user ${userId}: ${education.institution}`);
    return { message: 'Education record deleted successfully' };
  }

  // Resume Management
  async getResumes(userId: number): Promise<ResumeResponseDto[]> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const resumes = await this.prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return resumes.map(this.mapToResumeResponse);
  }

  async uploadResume(
    userId: number,
    file: Express.Multer.File,
    uploadData: ResumeUploadDto,
    authHeader?: string
  ): Promise<ResumeResponseDto> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);

    // 1. Upload file locally first (NestJS handles file storage)
    const { filePath, fileName } = await this.fileUploadService.uploadResume(file, userId);

    // 2. If this is set as primary, update other resumes to not be primary
    if (uploadData.isPrimary) {
      await this.prisma.resume.updateMany({
        where: { profileId: profile.id, isPrimary: true },
        data: { isPrimary: false, updatedAt: new Date() },
      });
    }

    // 3. Create resume record in NestJS database
    const resume = await this.prisma.resume.create({
      data: {
        profileId: profile.id,
        filename: fileName,
        originalName: file.originalname,
        filePath: filePath,
        fileSize: file.size,
        mimetype: file.mimetype,
        isPrimary: uploadData.isPrimary || false,
        parseStatus: ParseStatus.PENDING,
      },
    });

    // 4. Send resume to FastAPI for parsing with the auth header
    this.triggerFastApiProcessingAsync(
  resume.id,
  profile.id,
  file.buffer,
  file.originalname,
  uploadData.enhanceImages ?? false,
  uploadData.isPrimary || false, 
  authHeader  
);

    this.logger.log(`Resume uploaded for user ${userId}: ${file.originalname}`);
    return this.mapToResumeResponse(resume);
  }


  async deleteResume(userId: number, resumeId: number): Promise<{ message: string }> {
    await this.validateCandidateAccess(userId);

    const profile = await this.getProfileByUserId(userId);
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, profileId: profile.id },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Delete file from storage
    await this.fileUploadService.deleteFile(resume.filename, FileType.RESUME);

    // Delete resume record
    await this.prisma.resume.delete({
      where: { id: resumeId },
    });

    this.logger.log(`Resume deleted for user ${userId}: ${resume.originalName}`);
    return { message: 'Resume deleted successfully' };
  }


async setPrimaryResume(userId: number, resumeId: number): Promise<{ message: string }> {
  await this.validateCandidateAccess(userId);

  const profile = await this.getProfileByUserId(userId);
  const resume = await this.prisma.resume.findFirst({
    where: { id: resumeId, profileId: profile.id },
    // include: { parsedData: true }
  });

  if (!resume) {
    throw new NotFoundException('Resume not found');
  }

  if (!resume.parsedData) {
    throw new BadRequestException('Resume has not been parsed yet. Cannot set as primary.');
  }

  if (resume.parseStatus !== ParseStatus.COMPLETED) {
    throw new BadRequestException('Resume parsing is not complete. Cannot set as primary.');
  }

  // Start a transaction to ensure data consistency
  await this.prisma.$transaction(async (tx) => {
    // 1. Update all resumes to not be primary
    await tx.resume.updateMany({
      where: { profileId: profile.id },
      data: { isPrimary: false, updatedAt: new Date() },
    });

    // 2. Set this resume as primary
    await tx.resume.update({
      where: { id: resumeId },
      data: { isPrimary: true, updatedAt: new Date() },
    });

    // 3. Trigger FastAPI to process the primary resume change
    await this.triggerFastApiSetPrimary(resumeId, profile.id, this.getAuthHeader());
  });

  this.logger.log(`Primary resume set for user ${userId}: ${resume.originalName}`);
  return { message: 'Primary resume updated successfully' };
}

// New method to trigger FastAPI for setting primary resume
private async triggerFastApiSetPrimary(
  resumeId: number,
  profileId: number,
  authHeader?: string
): Promise<void> {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.fastApiBaseUrl}/api/v1/resumes/${resumeId}/set-primary`,
        {
          profile_id: profileId,
          resume_id: resumeId,
        },
        {
          timeout: 300000,
          headers: headers,
        }
      )
    );

    this.logger.log(`FastAPI primary resume processing completed for resume ${resumeId}`);
  } catch (error) {
    this.logger.error(
      `Failed to trigger FastAPI primary resume processing for resume ${resumeId}: ${error.message}`,
      error
    );
    throw new InternalServerErrorException('Failed to process primary resume change');
  }
}

// Helper to get auth header from context
private getAuthHeader(): string | undefined {
  // Implement based on your auth strategy
  // This is a placeholder - adjust based on your implementation
  return undefined;
}


  // Complete Profile Data
async getCompleteProfileData(userId: number): Promise<CompleteProfileDataResponseDto> {
  await this.validateCandidateAccess(userId);
  
  const profile = await this.getProfile(userId);
  
  // Get primary resume
  const primaryResume = await this.prisma.resume.findFirst({
    where: { profileId: profile.id, isPrimary: true }
  });

  // Get filtered data based on primary resume + manual
  const [skills, workExperiences, educations, resumes] = await Promise.all([
    this.getFilteredSkills(userId, primaryResume?.id),
    this.getFilteredWorkExperiences(userId, primaryResume?.id), 
    this.getFilteredEducations(userId, primaryResume?.id),
    this.getResumes(userId)
  ]);

  return { profile, skills, workExperiences, educations, resumes };
}



  // Helper Methods
  private async validateCandidateAccess(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.CANDIDATE) {
      throw new ForbiddenException('Only candidates can access profile features');
    }
  }

  private async getProfileByUserId(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  private calculateProfileCompleteness(profile: any): number {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.phone,
      profile.location,
      profile.headline,
      profile.bio,
      profile.linkedinUrl,
    ];

    const filledFields = fields.filter(field => field && field.trim().length > 0).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Calls your FastAPI upload endpoint which will:
   * 1. Parse the resume with AI
   * 2. Extract skills, work experience, education
   * 3. Generate embeddings
   * 4. Update the database with parsed data
   */
// profile.service.ts - Updated upload method

private async triggerFastApiProcessingAsync(
  resumeId: number,
  profileId: number,
  fileBuffer: Buffer,
  filename: string,
  enhanceImages: boolean,
  isPrimary: boolean, 
  authHeader?: string
): Promise<void> {
  try {
    // Update status to processing
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { parseStatus: ParseStatus.PROCESSING, updatedAt: new Date() },
    });

    // Create FormData to send file as multipart/form-data
    const FormData = require('form-data');
    const form = new FormData();

    // Add file as buffer with proper filename and content type
    const mimetype = this.getMimeType(filename);
    form.append('file', fileBuffer, {
      filename: filename,
      contentType: mimetype,
    });

    // Add other parameters - IMPORTANT: Send the actual isPrimary value
    form.append('is_primary', isPrimary.toString());
    form.append('enhance_images', enhanceImages.toString());
    form.append('profile_id', profileId.toString());
    form.append('resume_id', resumeId.toString());

    // Prepare headers
    const headers: any = {
      ...form.getHeaders(),
    };

    // Add authorization header if provided
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Call your FastAPI upload endpoint with proper headers
    const response = await firstValueFrom(
      this.httpService.post(`${this.fastApiBaseUrl}/api/v1/resumes/upload`, form, {
        timeout: 300000,
        headers: headers,
      })
    );

    this.logger.log(`FastAPI processing completed successfully for resume ${resumeId}`);
  } catch (error) {
    this.logger.error(
      `Failed to trigger FastAPI processing for resume ${resumeId}: ${error.message}`,
      error
    );

    // Update resume status to failed
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { parseStatus: ParseStatus.FAILED, updatedAt: new Date() },
    });
  }
}



  // Helper method to get MIME type
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'txt': 'text/plain',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }


  // Mapping Methods
  private mapToProfileResponse(profile: any): ProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      location: profile.location,
      headline: profile.headline,
      bio: profile.bio,
      profilePhotoUrl: profile.profilePhotoUrl,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      websiteUrl: profile.websiteUrl,
      profileCompleteness: profile.profileCompleteness,
      privacyMode: profile.privacyMode,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private mapToSkillResponse = (skill: any): ProfileSkillResponseDto => ({
    id: skill.id,
    skillName: skill.skillName,
    category: skill.category,
    proficiencyLevel: skill.proficiencyLevel,
    yearsExperience: skill.yearsExperience,
    source: skill.source,
    verified: skill.verified,
  });

  private mapToWorkExperienceResponse = (experience: any): WorkExperienceResponseDto => ({
    id: experience.id,
    company: experience.company,
    position: experience.position,
    location: experience.location,
    startDate: experience.startDate,
    endDate: experience.endDate,
    isCurrent: experience.isCurrent,
    description: experience.description,
    achievements: experience.achievements,
    skills: experience.skills,
  });

  private mapToEducationResponse = (education: any): EducationResponseDto => ({
    id: education.id,
    institution: education.institution,
    degree: education.degree,
    field: education.field,
    startDate: education.startDate,
    endDate: education.endDate,
    grade: education.grade,
    description: education.description,
  });

  private mapToResumeResponse = (resume: any): ResumeResponseDto => ({
    id: resume.id,
    filename: resume.filename,
    originalName: resume.originalName,
    filePath: resume.filePath,
    fileSize: resume.fileSize,
    mimetype: resume.mimetype,
    parseStatus: resume.parseStatus,
    confidenceScore: resume.confidenceScore,
    isPrimary: resume.isPrimary,
    createdAt: resume.createdAt,
    parsedData: resume.parsedData,
  });

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
