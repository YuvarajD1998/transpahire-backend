import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

@Processor('resume-parsing')
export class ResumeParsingProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeParsingProcessor.name);
  private prisma = new PrismaClient();

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, resumeUrl } = job.data;
    
    this.logger.log(`Processing resume parsing job for user ${userId}`);

    try {
      // Here you would integrate with your AI microservice
      // For now, we'll simulate the parsing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const parsedData = {
        skills: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
        experience: [
          {
            company: 'Tech Corp',
            position: 'Software Developer',
            duration: '2 years',
            description: 'Developed web applications using React and Node.js',
          },
        ],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Science in Computer Science',
            year: '2020',
          },
        ],
      };

      // Update user profile with parsed data
      await this.prisma.profile.update({
        where: { userId },
        data: {
          skills: parsedData.skills,
          experience: parsedData.experience,
        },
      });

      this.logger.log(`Successfully parsed resume for user ${userId}`);
      return { success: true, parsedData };

    } catch (error) {
      this.logger.error(`Failed to parse resume for user ${userId}`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Resume parsing job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Resume parsing job ${job.id} failed:`, error);
  }

  // Clean up database connection
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
