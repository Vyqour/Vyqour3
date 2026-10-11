import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    private readonly mail;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, mail: MailService);
    private hash;
    private compare;
    private signAccess;
    private issueRefreshToken;
    private sanitize;
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            avatarUrl: string | null;
            emailVerified: boolean;
            phone: string | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, meta?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            avatarUrl: string | null;
            emailVerified: boolean;
            phone: string | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshToken: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            avatarUrl: string | null;
            emailVerified: boolean;
            phone: string | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken?: string): Promise<{
        message: string;
    }>;
    logoutAll(userId: string): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    validateGoogleUser(profile: {
        googleId: string;
        email?: string;
        firstName: string;
        lastName?: string;
        avatarUrl?: string;
        emailVerified?: boolean;
    }): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            avatarUrl: string | null;
            emailVerified: boolean;
            phone: string | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    me(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.Role;
        emailVerified: boolean;
        createdAt: Date;
    }>;
}
