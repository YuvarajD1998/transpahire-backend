import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('resume-parsing') private resumeParsingQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async addEmailJob(to: string, subject: string, template: string, data: any) {
    try {
      const job = await this.emailQueue.add('send-email', {
        to,
        subject,
        template,
        data,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`Added email job: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add email job', error);
      throw error;
    }
  }

  async addResumeParsingJob(userId: number, resumeUrl: string) {
    try {
      const job = await this.resumeParsingQueue.add('parse-resume', {
        userId,
        resumeUrl,
      }, {
        attempts: 2,
        delay: 1000,
      });

      this.logger.log(`Added resume parsing job: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add resume parsing job', error);
      throw error;
    }
  }

  async addNotificationJob(userId: number, type: string, data: any) {
    try {
      const job = await this.notificationQueue.add('send-notification', {
        userId,
        type,
        data,
      }, {
        priority: type === 'urgent' ? 1 : 5,
      });

      this.logger.log(`Added notification job: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add notification job', error);
      throw error;
    }
  }
}
