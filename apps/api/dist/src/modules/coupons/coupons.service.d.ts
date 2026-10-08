import { CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CouponsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: {
        code: string;
        description?: string;
        type: CouponType;
        value: number;
        minOrderAmount?: number;
        maxDiscount?: number;
        usageLimit?: number;
        perUserLimit?: number;
        startsAt: string;
        expiresAt: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CouponType;
        description: string | null;
        isActive: boolean;
        code: string;
        value: Prisma.Decimal;
        minOrderAmount: Prisma.Decimal | null;
        maxDiscount: Prisma.Decimal | null;
        usageLimit: number | null;
        usageCount: number;
        perUserLimit: number;
        startsAt: Date;
        expiresAt: Date;
    }>;
    list(page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CouponType;
            description: string | null;
            isActive: boolean;
            code: string;
            value: Prisma.Decimal;
            minOrderAmount: Prisma.Decimal | null;
            maxDiscount: Prisma.Decimal | null;
            usageLimit: number | null;
            usageCount: number;
            perUserLimit: number;
            startsAt: Date;
            expiresAt: Date;
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
    validate(code: string, subtotal: number): Promise<{
        coupon: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CouponType;
            description: string | null;
            isActive: boolean;
            code: string;
            value: Prisma.Decimal;
            minOrderAmount: Prisma.Decimal | null;
            maxDiscount: Prisma.Decimal | null;
            usageLimit: number | null;
            usageCount: number;
            perUserLimit: number;
            startsAt: Date;
            expiresAt: Date;
        };
        discount: number;
    }>;
    update(id: string, data: Prisma.CouponUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CouponType;
        description: string | null;
        isActive: boolean;
        code: string;
        value: Prisma.Decimal;
        minOrderAmount: Prisma.Decimal | null;
        maxDiscount: Prisma.Decimal | null;
        usageLimit: number | null;
        usageCount: number;
        perUserLimit: number;
        startsAt: Date;
        expiresAt: Date;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
