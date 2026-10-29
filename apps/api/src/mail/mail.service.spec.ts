import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService password reset delivery', () => {
  const createMailService = () => {
    const values: Record<string, string | number> = {
      'smtp.host': 'smtp.example.test',
      'smtp.user': 'mailer@example.test',
      'smtp.pass': 'test-password',
      'smtp.port': 587,
      'smtp.from': 'VYQOUR <noreply@example.test>',
      webUrl: 'https://vyqour.example.test',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new MailService(config);
  };

  it('returns true only when the mail provider accepts the reset email', async () => {
    const service = createMailService();
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
    (service as any).transporter = { sendMail };

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.test',
        subject: 'Reset your VYQOUR password',
        html: expect.stringContaining('/reset-password?token=secure-token'),
      }),
    );
  });

  it('returns false when the mail provider rejects the reset email', async () => {
    const service = createMailService();
    (service as any).transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP unavailable')),
    };

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(false);
  });

  it('returns false when SMTP is not configured', async () => {
    const config = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    const service = new MailService(config);

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(false);
  });
});
