import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  renderEmailTemplate,
  type EmailTemplateName,
} from './email-templates';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('SMTP_PORT') ?? 587),
        secure: this.config.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
    }
  }

  async send(params: {
    tenantId: string;
    to: string;
    template: EmailTemplateName;
    subject?: string;
    context: Record<string, unknown>;
    dedupeKey?: string;
  }): Promise<{ sent: boolean; channel: string }> {
    const channel = 'email';
    if (params.dedupeKey) {
      const existing = await this.prisma.notificationDelivery.findUnique({
        where: {
          tenantId_dedupeKey_channel: {
            tenantId: params.tenantId,
            dedupeKey: params.dedupeKey,
            channel,
          },
        },
      });
      if (existing) {
        return { sent: false, channel };
      }
    }

    const rendered = renderEmailTemplate(params.template, params.context);
    const subject = params.subject ?? rendered.subject;
    const from =
      this.config.get<string>('SMTP_FROM') ?? 'noreply@nexaassist.local';

    if (this.transporter) {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject,
        text: rendered.text,
        html: rendered.html,
      });
      this.logger.log({ to: params.to, template: params.template }, 'Email sent via SMTP');
    } else {
      this.logger.log(
        {
          to: params.to,
          template: params.template,
          subject,
          text: rendered.text,
        },
        'Email (console — SMTP not configured)',
      );
    }

    if (params.dedupeKey) {
      await this.prisma.notificationDelivery.create({
        data: {
          tenantId: params.tenantId,
          dedupeKey: params.dedupeKey,
          channel,
        },
      });
    }

    return { sent: true, channel };
  }
}
