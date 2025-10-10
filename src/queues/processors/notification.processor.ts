import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private prisma = new PrismaClient();

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, type, data } = job.data;
    
    this.logger.log(`Processing notification job for user ${userId} of type ${type}`);

    try {
      // Handle different notification types
      switch (type) {
        case 'application_status':
          await this.handleApplicationStatusNotification(userId, data);
          break;
        case 'new_message':
          await this.handleNewMessageNotification(userId, data);
          break;
        case 'interview_reminder':
          await this.handleInterviewReminderNotification(userId, data);
          break;
        case 'urgent':
          await this.handleUrgentNotification(userId, data);
          break;
        default:
          await this.handleGenericNotification(userId, data);
      }

      this.logger.log(`Notification sent to user ${userId}`);
      return { success: true, userId, type };

    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}`, error);
      throw error;
    }
  }

  private async handleApplicationStatusNotification(userId: number, data: any) {
    // Handle application status change notifications
    console.log(`Application status notification for user ${userId}:`, data);
    // Here you'd integrate with push notification service, email, etc.
  }

  private async handleNewMessageNotification(userId: number, data: any) {
    // Handle new message notifications
    console.log(`New message notification for user ${userId}:`, data);
  }

  private async handleInterviewReminderNotification(userId: number, data: any) {
    // Handle interview reminder notifications
    console.log(`Interview reminder for user ${userId}:`, data);
  }

  private async handleUrgentNotification(userId: number, data: any) {
    // Handle urgent notifications with high priority
    console.log(`Urgent notification for user ${userId}:`, data);
  }

  private async handleGenericNotification(userId: number, data: any) {
    // Handle generic notifications
    console.log(`Generic notification for user ${userId}:`, data);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed:`, error);
  }

  // Clean up database connection
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
