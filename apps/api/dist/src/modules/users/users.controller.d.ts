import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
}
declare class UpdateRoleDto {
    role: Role;
}
declare class UpdateStatusDto {
    status: UserStatus;
}
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    updateMe(user: AuthUser, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.Role;
        emailVerified: boolean;
    }>;
    deleteMe(user: AuthUser): Promise<{
        message: string;
    }>;
    adminAll(page?: string, limit?: string, search?: string, role?: string): Promise<{
        data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            phone: string | null;
            role: import(".prisma/client").$Enums.Role;
            status: import(".prisma/client").$Enums.UserStatus;
            emailVerified: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            _count: {
                orders: number;
            };
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    role(id: string, dto: UpdateRoleDto): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
    }>;
    status(id: string, dto: UpdateStatusDto): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
    }>;
}
export {};
