import { CouponType } from '@prisma/client';
import { CouponsService } from './coupons.service';
declare class CreateCouponDto {
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
}
export declare class CouponsController {
    private readonly coupons;
    constructor(coupons: CouponsService);
    validate(code: string, subtotal: string): Promise<{
        coupon: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CouponType;
            description: string | null;
            isActive: boolean;
            code: string;
            value: import("@prisma/client/runtime/library").Decimal;
            minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
            maxDiscount: import("@prisma/client/runtime/library").Decimal | null;
            usageLimit: number | null;
            usageCount: number;
            perUserLimit: number;
            startsAt: Date;
            expiresAt: Date;
        };
        discount: number;
    }>;
    list(page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CouponType;
            description: string | null;
            isActive: boolean;
            code: string;
            value: import("@prisma/client/runtime/library").Decimal;
            minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
            maxDiscount: import("@prisma/client/runtime/library").Decimal | null;
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
    create(dto: CreateCouponDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CouponType;
        description: string | null;
        isActive: boolean;
        code: string;
        value: import("@prisma/client/runtime/library").Decimal;
        minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
        maxDiscount: import("@prisma/client/runtime/library").Decimal | null;
        usageLimit: number | null;
        usageCount: number;
        perUserLimit: number;
        startsAt: Date;
        expiresAt: Date;
    }>;
    update(id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CouponType;
        description: string | null;
        isActive: boolean;
        code: string;
        value: import("@prisma/client/runtime/library").Decimal;
        minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
        maxDiscount: import("@prisma/client/runtime/library").Decimal | null;
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
export {};
