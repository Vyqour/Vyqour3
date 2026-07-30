import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { Role } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private async hash(value: string) {
    return bcrypt.hash(value, BCRYPT_ROUNDS);
  }

  private async compare(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }

  private signAccess(user: { id: string; email: string; role: Role }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpires') || '15m',
      },
    );
  }

  private async issueRefreshToken(
    userId: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const token = randomBytes(48).toString('hex');
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });
    return token;
  }

  private sanitize(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    role: Role;
    avatarUrl: string | null;
    emailVerified: boolean;
    phone?: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      phone: user.phone ?? null,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });

    const verifyToken = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
   // Fire-and-forget: never let a slow/unreachable SMTP server delay or fail registration
    this.mail.sendVerificationEmail(user.email, verifyToken).catch(() => undefined);

    const accessToken = this.signAccess(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      user: this.sanitize(user),
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    const ok = await this.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.signAccess(user);
    const refreshToken = await this.issueRefreshToken(user.id, meta);
    return { user: this.sanitize(user), accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account inactive');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const accessToken = this.signAccess(stored.user);
    const newRefresh = await this.issueRefreshToken(stored.user.id, {
      userAgent: stored.userAgent || undefined,
      ipAddress: stored.ipAddress || undefined,
    });
    return {
      user: this.sanitize(stored.user),
      accessToken,
      refreshToken: newRefresh,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return { message: 'Logged out' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Logged out from all devices' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Always return success to prevent email enumeration
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      // Fire-and-forget: don't make the user wait on SMTP for this response
      this.mail.sendPasswordResetEmail(user.email, token).catch(() => undefined);
    }
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await this.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { user: { email: record.email } },
      }),
    ]);
    return { message: 'Password updated successfully' };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);
    return { message: 'Email verified successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('Password login not available');
    const ok = await this.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await this.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Password changed successfully' };
  }

  async validateGoogleUser(profile: {
    googleId: string;
    email?: string;
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
  }) {
    if (!profile.email) throw new BadRequestException('Google account has no email');
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
      },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          googleId: profile.googleId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          avatarUrl: user.avatarUrl || profile.avatarUrl,
        },
      });
    }
    const accessToken = this.signAccess(user);
    const refreshToken = await this.issueRefreshToken(user.id);
    return { user: this.sanitize(user), accessToken, refreshToken };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
