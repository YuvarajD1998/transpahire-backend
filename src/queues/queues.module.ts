import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';
import { EmailProcessor } from './processors/email.processor';
import { ResumeParsingProcessor } from './processors/resume-parsing.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'resume-parsing' },
      { name: 'notifications' }
    ),
  ],
  providers: [
    QueuesService,
    EmailProcessor,           // Email job processor
    ResumeParsingProcessor,   // Resume parsing processor  
    NotificationProcessor,    // Notification processor
  ],
  exports: [QueuesService], // Export for use in other modules
})
export class QueuesModule {}
