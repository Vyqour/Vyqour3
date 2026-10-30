import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('resend.apiKey');
    this.from = this.config.get<string>('resend.from') || 'VYQOUR <noreply@vyqour.com>';
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY is not configured — outgoing emails are disabled');
    }
  }

  private async send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(`Email not sent: Resend API key is not configured (subject=${subject})`);
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const details = await response.text();
        this.logger.error(`Resend rejected email (status=${response.status}): ${details}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send email to=${to} subject=${subject}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const webUrl = this.config.get<string>('webUrl');
    const link = `${webUrl}/verify-email?token=${token}`;
    await this.send(
      email,
      'Verify your VYQOUR account',
      `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Welcome. Verify your email to start wearing your identity.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Verify Email</a>
        <p style="margin-top:24px;color:#888;font-size:12px">Or open: ${link}</p>
      </div>`,
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const webUrl = this.config.get<string>('webUrl');
    const link = `${webUrl}/reset-password?token=${token}`;
    return this.send(
      email,
      'Reset your VYQOUR password',
      `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>We received a password reset request. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password</a>
        <p style="margin-top:24px;color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>`,
    );
  }

  async sendOrderConfirmation(email: string, orderNumber: string, total: string) {
    const webUrl = this.config.get<string>('webUrl');
    await this.send(
      email,
      `Order confirmed · ${orderNumber}`,
      `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Thanks for your order <strong>${orderNumber}</strong>.</p>
        <p>Total: <strong>₹${total}</strong></p>
        <a href="${webUrl}/track-order?order=${orderNumber}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track Order</a>
      </div>`,
    );
  }

  async sendShippingNotification(
    email: string,
    orderNumber: string,
    trackingNumber?: string,
    carrier?: string,
  ) {
    const webUrl = this.config.get<string>('webUrl');
    const track = trackingNumber
      ? `<p>Tracking: <strong>${trackingNumber}</strong>${carrier ? ` · ${carrier}` : ''}</p>`
      : '';
    await this.send(
      email,
      `Your VYQOUR order shipped · ${orderNumber}`,
      `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">VYQOUR</h1>
        <p>Good news — order <strong>${orderNumber}</strong> is on the way.</p>
        ${track}
        <a href="${webUrl}/track-order?order=${orderNumber}" style="display:inline-block;margin-top:16px;background:#5B21B6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track shipment</a>
      </div>`,
    );
  }

  async sendContactMessage(
    to: string,
    data: { name: string; email: string; subject: string; message: string },
  ) {
    await this.send(
      to,
      `[Contact] ${data.subject}`,
      `<div style="font-family:Inter,Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px">
        <h1 style="color:#a78bfa">New contact message</h1>
        <p><strong>From:</strong> ${data.name} (${data.email})</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <div style="margin-top:16px;padding:16px;background:#1a1a1a;border-radius:8px">
          ${data.message}
        </div>
        <p style="margin-top:24px;color:#888;font-size:12px">Reply directly to this email to respond to ${data.email}.</p>
      </div>`,
      data.email,
    );
  }
      }
