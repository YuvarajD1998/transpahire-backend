import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { to, subject, template, data } = job.data;
    
    this.logger.log(`Processing email job ${job.id} for ${to}`);
    
    try {
      // Here you'd integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log(`Sending email to: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);
      console.log(`Data:`, data);
      
      // Mock email sending - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true, recipient: to };
      
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Email job ${job.id} started processing`);
  }
}
