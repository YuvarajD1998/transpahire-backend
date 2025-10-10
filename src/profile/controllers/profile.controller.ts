// src/modules/profile/controllers/profile.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Request,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CandidateGuard } from '../guards/candidate.guard';
import { ProfileService } from '../services/profile.service';
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
} from '../dto/response.dto';

@ApiTags('Profile Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CandidateGuard)
@Controller('profile')
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(private readonly profileService: ProfileService) { }

  // Profile Management
  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully', type: ProfileResponseDto })
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(req.user.sub);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: ProfileResponseDto })
  async updateProfile(
    @Request() req,
    @Body() updateData: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(req.user.sub, updateData);
  }

@Post('photo')
@ApiOperation({ summary: 'Upload profile photo' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Upload profile photo (jpeg, png, webp)',
      },
    },
    required: ['file'],
  },
})
@ApiResponse({ status: 201, description: 'Profile photo uploaded successfully' })
@UseInterceptors(FileInterceptor('file'))
async uploadProfilePhoto(
  @Request() req,
  @UploadedFile() file: Express.Multer.File,
): Promise<{ photoUrl: string }> {
  return this.profileService.uploadProfilePhoto(req.user.sub, file);
}


  @Delete('photo')
  @ApiOperation({ summary: 'Delete profile photo' })
  @ApiResponse({ status: 200, description: 'Profile photo deleted successfully' })
  async deleteProfilePhoto(@Request() req): Promise<{ message: string }> {
    return this.profileService.deleteProfilePhoto(req.user.sub);
  }

  // Skills Management
  @Get('skills')
  @ApiOperation({ summary: 'Get all profile skills' })
  @ApiResponse({ status: 200, description: 'Skills retrieved successfully', type: [ProfileSkillResponseDto] })
  async getSkills(@Request() req): Promise<ProfileSkillResponseDto[]> {
    return this.profileService.getSkills(req.user.sub);
  }

  @Post('skills')
  @ApiOperation({ summary: 'Add a new skill' })
  @ApiResponse({ status: 201, description: 'Skill created successfully', type: ProfileSkillResponseDto })
  async createSkill(
    @Request() req,
    @Body() skillData: CreateProfileSkillDto,
  ): Promise<ProfileSkillResponseDto> {
    return this.profileService.createSkill(req.user.sub, skillData);
  }

  @Put('skills/:skillId')
  @ApiOperation({ summary: 'Update a skill' })
  @ApiResponse({ status: 200, description: 'Skill updated successfully', type: ProfileSkillResponseDto })
  async updateSkill(
    @Request() req,
    @Param('skillId', ParseIntPipe) skillId: number,
    @Body() updateData: UpdateProfileSkillDto,
  ): Promise<ProfileSkillResponseDto> {
    return this.profileService.updateSkill(req.user.sub, skillId, updateData);
  }

  @Delete('skills/:skillId')
  @ApiOperation({ summary: 'Delete a skill' })
  @ApiResponse({ status: 200, description: 'Skill deleted successfully' })
  async deleteSkill(
    @Request() req,
    @Param('skillId', ParseIntPipe) skillId: number,
  ): Promise<{ message: string }> {
    return this.profileService.deleteSkill(req.user.sub, skillId);
  }

  // Work Experience Management
  @Get('experience')
  @ApiOperation({ summary: 'Get all work experiences' })
  @ApiResponse({ status: 200, description: 'Work experiences retrieved successfully', type: [WorkExperienceResponseDto] })
  async getWorkExperiences(@Request() req): Promise<WorkExperienceResponseDto[]> {
    return this.profileService.getWorkExperiences(req.user.sub);
  }

  @Post('experience')
  @ApiOperation({ summary: 'Add new work experience' })
  @ApiResponse({ status: 201, description: 'Work experience created successfully', type: WorkExperienceResponseDto })
  async createWorkExperience(
    @Request() req,
    @Body() experienceData: CreateWorkExperienceDto,
  ): Promise<WorkExperienceResponseDto> {
    return this.profileService.createWorkExperience(req.user.sub, experienceData);
  }

  @Put('experience/:experienceId')
  @ApiOperation({ summary: 'Update work experience' })
  @ApiResponse({ status: 200, description: 'Work experience updated successfully', type: WorkExperienceResponseDto })
  async updateWorkExperience(
    @Request() req,
    @Param('experienceId', ParseIntPipe) experienceId: number,
    @Body() updateData: UpdateWorkExperienceDto,
  ): Promise<WorkExperienceResponseDto> {
    return this.profileService.updateWorkExperience(req.user.sub, experienceId, updateData);
  }

  @Delete('experience/:experienceId')
  @ApiOperation({ summary: 'Delete work experience' })
  @ApiResponse({ status: 200, description: 'Work experience deleted successfully' })
  async deleteWorkExperience(
    @Request() req,
    @Param('experienceId', ParseIntPipe) experienceId: number,
  ): Promise<{ message: string }> {
    return this.profileService.deleteWorkExperience(req.user.sub, experienceId);
  }

  // Education Management
  @Get('education')
  @ApiOperation({ summary: 'Get all education records' })
  @ApiResponse({ status: 200, description: 'Education records retrieved successfully', type: [EducationResponseDto] })
  async getEducations(@Request() req): Promise<EducationResponseDto[]> {
    return this.profileService.getEducations(req.user.sub);
  }

  @Post('education')
  @ApiOperation({ summary: 'Add new education record' })
  @ApiResponse({ status: 201, description: 'Education record created successfully', type: EducationResponseDto })
  async createEducation(
    @Request() req,
    @Body() educationData: CreateEducationDto,
  ): Promise<EducationResponseDto> {
    return this.profileService.createEducation(req.user.sub, educationData);
  }

  @Put('education/:educationId')
  @ApiOperation({ summary: 'Update education record' })
  @ApiResponse({ status: 200, description: 'Education record updated successfully', type: EducationResponseDto })
  async updateEducation(
    @Request() req,
    @Param('educationId', ParseIntPipe) educationId: number,
    @Body() updateData: UpdateEducationDto,
  ): Promise<EducationResponseDto> {
    return this.profileService.updateEducation(req.user.sub, educationId, updateData);
  }

  @Delete('education/:educationId')
  @ApiOperation({ summary: 'Delete education record' })
  @ApiResponse({ status: 200, description: 'Education record deleted successfully' })
  async deleteEducation(
    @Request() req,
    @Param('educationId', ParseIntPipe) educationId: number,
  ): Promise<{ message: string }> {
    return this.profileService.deleteEducation(req.user.sub, educationId);
  }

  // Resume Management
  @Get('resumes')
  @ApiOperation({ summary: 'Get all resumes' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully', type: [ResumeResponseDto] })
  async getResumes(@Request() req): Promise<ResumeResponseDto[]> {
    return this.profileService.getResumes(req.user.sub);
  }

  @Post('resumes')
@ApiOperation({ summary: 'Upload new resume' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
      isPrimary: {
        type: 'boolean',
        description: 'Set as primary resume',
        default: false,
      },
      enhanceImages: {
        type: 'boolean',
        description: 'Enable image enhancement during parsing',
        default: false,
      },
    },
    required: ['file'],
  },
})
@ApiResponse({ status: 201, description: 'Resume uploaded successfully', type: ResumeResponseDto })
@UseInterceptors(FileInterceptor('file'))
async uploadResume(
  @Request() req,
  @UploadedFile() file: Express.Multer.File,
  @Body() uploadData: ResumeUploadDto,
): Promise<ResumeResponseDto> {
  // Extract the authorization header
  const authHeader = req.headers.authorization;
  
  return this.profileService.uploadResume(req.user.sub, file, uploadData, authHeader);
}



  @Delete('resumes/:resumeId')
  @ApiOperation({ summary: 'Delete resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  async deleteResume(
    @Request() req,
    @Param('resumeId', ParseIntPipe) resumeId: number,
  ): Promise<{ message: string }> {
    return this.profileService.deleteResume(req.user.sub, resumeId);
  }

  @Put('resumes/:resumeId/primary')
  @ApiOperation({ summary: 'Set resume as primary' })
  @ApiResponse({ status: 200, description: 'Primary resume updated successfully' })
  async setPrimaryResume(
    @Request() req,
    @Param('resumeId', ParseIntPipe) resumeId: number,
  ): Promise<{ message: string }> {
    return this.profileService.setPrimaryResume(req.user.sub, resumeId);
  }

  // Complete Profile Data
  @Get('complete')
  @ApiOperation({ summary: 'Get complete profile data' })
  @ApiResponse({ status: 200, description: 'Complete profile data retrieved successfully', type: CompleteProfileDataResponseDto })
  async getCompleteProfileData(@Request() req): Promise<CompleteProfileDataResponseDto> {
    return this.profileService.getCompleteProfileData(req.user.sub);
  }
}
