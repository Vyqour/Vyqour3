export declare class RegisterDto {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    phone?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    password: string;
}
export declare class VerifyEmailDto {
    token: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class RefreshTokenDto {
    refreshToken?: string;
}
