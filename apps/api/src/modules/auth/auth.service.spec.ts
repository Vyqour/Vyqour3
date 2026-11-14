import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService Google account validation', () => {
  const user = (overrides: Record<string, unknown> = {}) => ({
    id: 'user_123',
    email: 'customer@example.com',
    firstName: 'Customer',
    lastName: null,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    avatarUrl: null,
    phone: null,
    emailVerified: false,
    emailVerifiedAt: null,
    googleId: null,
    passwordHash: null,
    ...overrides,
  });

  let prisma: any;
  let jwt: any;
  let config: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'refresh_1' }),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-access-token') };
    config = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
      get: jest.fn().mockReturnValue('15m'),
    };
    service = new AuthService(prisma, jwt, config, {} as any);
  });

  it('rejects a Google profile without a verified email before looking up accounts', async () => {
    await expect(
      service.validateGoogleUser({
        googleId: 'google_1',
        email: 'customer@example.com',
        firstName: 'Customer',
        emailVerified: false,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a customer for a new verified Google identity', async () => {
    const created = user({
      googleId: 'google_1',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(created);

    const result = await service.validateGoogleUser({
      googleId: 'google_1',
      email: 'CUSTOMER@example.com',
      firstName: 'Customer',
      emailVerified: true,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'customer@example.com',
          googleId: 'google_1',
          emailVerified: true,
        }),
      }),
    );
    expect(result.user.email).toBe('customer@example.com');
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).toBeDefined();
  });

  it('links a verified Google identity to the matching active email account', async () => {
    const existing = user({ passwordHash: 'password-hash' });
    const linked = user({
      passwordHash: 'password-hash',
      googleId: 'google_1',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    prisma.user.update.mockResolvedValue(linked);

    await service.validateGoogleUser({
      googleId: 'google_1',
      email: 'customer@example.com',
      firstName: 'Customer',
      emailVerified: true,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_123' },
        data: expect.objectContaining({ googleId: 'google_1', emailVerified: true }),
      }),
    );
  });

  it('rejects inactive Google accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ googleId: 'google_1', status: 'SUSPENDED' }));

    await expect(
      service.validateGoogleUser({
        googleId: 'google_1',
        email: 'customer@example.com',
        firstName: 'Customer',
        emailVerified: true,
      }),
    ).rejects.toThrow('Account is inactive');

    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
