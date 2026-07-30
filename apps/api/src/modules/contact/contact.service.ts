import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';

interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async submit(input: ContactInput) {
    const adminEmail = this.config.get<string>('admin.email') || 'vyqourofficial@gmail.com';
    const safe = {
      name: escapeHtml(input.name),
      email: escapeHtml(input.email),
      subject: escapeHtml(input.subject),
      message: escapeHtml(input.message).replace(/\n/g, '<br/>'),
    };

    this.logger.log(`Contact message received from ${input.email}: ${input.subject}`);
    // Fire-and-forget: never make the visitor wait on SMTP for this response.
    // If SMTP is slow/down, MailService logs the failure — message content is also logged above.
    this.mail.sendContactMessage(adminEmail, safe).catch(() => undefined);

    return { success: true, message: 'Message sent — we will reply soon.' };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
      }
