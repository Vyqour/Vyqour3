import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService password reset delivery through Resend', () => {
  const createMailService = (apiKey = 're_test_api_key') => {
    const values: Record<string, string> = {
      'resend.apiKey': apiKey,
      'resend.from': 'VYQOUR <noreply@example.test>',
      webUrl: 'https://vyqour.example.test',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new MailService(config);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the password reset email through the Resend HTTPS API', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    } as Response);
    const service = createMailService();

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_api_key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('/reset-password?token=secure-token'),
      }),
    );
    const payload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(payload).toMatchObject({
      from: 'VYQOUR <noreply@example.test>',
      to: ['customer@example.test'],
      subject: 'Reset your VYQOUR password',
    });
  });

  it('returns false when Resend rejects the email', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Invalid sender',
    } as Response);
    const service = createMailService();

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(false);
  });

  it('returns false when the Resend API key is missing', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = createMailService('');

    await expect(service.sendPasswordResetEmail('customer@example.test', 'secure-token')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
