import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('smtp.from') || 'VYQOUR <noreply@vyqour.com>';
    const host = this.config.get<string>('smtp.host');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('smtp.port') || 587,
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[email:dev] to=${to} subject=${subject}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
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

  async sendPasswordResetEmail(email: string, token: string) {
    const webUrl = this.config.get<string>('webUrl');
    const link = `${webUrl}/reset-password?token=${token}`;
    await this.send(
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
}
