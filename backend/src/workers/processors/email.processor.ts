import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailerService } from '../../emails/mailer.service';
import type { EmailTemplateName } from '../../emails/email-templates';
import type { SendEmailJobPayload } from '../../queues/queue-job.types';

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {}

  async process(job: Job<SendEmailJobPayload>): Promise<void> {
    const data = job.data;
    if (!data.tenantId || !data.to) {
      throw new Error('tenantId and to required on email job');
    }
    this.logger.log(
      { jobId: job.id, tenantId: data.tenantId, template: data.template },
      'Processing email job',
    );
    await this.mailer.send({
      tenantId: data.tenantId,
      to: data.to,
      template: data.template as EmailTemplateName,
      subject: data.subject,
      context: data.context,
      dedupeKey: data.dedupeKey,
    });
  }
}
