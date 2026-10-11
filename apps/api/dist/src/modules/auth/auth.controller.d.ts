import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly auth;
    private readonly config;
    constructor(auth: AuthService, config: ConfigService);
    register(dto: RegisterDto, req: Request, res: Response): Promise<{
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
    login(dto: LoginDto, req: Request, res: Response): Promise<{
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
    refresh(dto: RefreshTokenDto, req: Request, res: Response): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
    logout(dto: RefreshTokenDto, req: Request, res: Response): Promise<{
        message: string;
    }>;
    logoutAll(user: AuthUser, req: Request, res: Response): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    me(user: AuthUser): Promise<{
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
    googleAuth(): Promise<void>;
    googleCallback(req: Request, res: Response): Promise<void>;
}
