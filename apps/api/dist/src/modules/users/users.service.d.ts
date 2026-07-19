import { PrismaService } from '../../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.Role;
        emailVerified: boolean;
    }>;
    deleteAccount(userId: string): Promise<{
        message: string;
    }>;
    adminList(query: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
    }): Promise<{
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
    adminUpdateRole(id: string, role: Role): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
    }>;
    adminUpdateStatus(id: string, status: UserStatus): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
    }>;
}
