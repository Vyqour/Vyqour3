import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService - Session Restoration & Security', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: JwtService;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      emailVerificationToken: { create: jest.fn() },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const mockConfig = {
      getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessExpires') return '15m';
        return null;
      }),
    };

    const mockMail = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('issueRefreshToken (30-day target)', () => {
    it('issues a 30-day refresh token on login', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        passwordHash,
        status: 'ACTIVE',
        role: Role.CUSTOMER,
        firstName: 'Test',
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'user@example.com', password: 'password123' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      const createArgs = prisma.refreshToken.create.mock.calls[0][0].data;
      const daysDiff = (createArgs.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(30);
    });
  });

  describe('refresh token rotation', () => {
    it('rotates refresh token and returns new 30-day session', async () => {
      const oldExpiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        token: 'old_token',
        expiresAt: oldExpiresAt,
        user: { id: 'u1', email: 'user@example.com', status: 'ACTIVE', role: Role.CUSTOMER, firstName: 'Test' },
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('old_token');

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt1' } });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old_token');
    });

    it('rejects expired refresh token and deletes it', async () => {
      const expiredAt = new Date(Date.now() - 1000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt_expired',
        token: 'expired_token',
        expiresAt: expiredAt,
        user: { id: 'u1', status: 'ACTIVE' },
      });

      await expect(service.refresh('expired_token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt_expired' } });
    });
  });

  describe('logout', () => {
    it('deletes refresh token on logout', async () => {
      await service.logout('refresh_token_xyz');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'refresh_token_xyz' } });
    });
  });
});
