import { PrismaService } from '../../prisma/prisma.service';
export declare class ReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listForProduct(productId: string, page?: number, limit?: number): Promise<{
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            images: string[];
            productId: string;
            title: string | null;
            isApproved: boolean;
            body: string;
            rating: number;
            isVerified: boolean;
            helpfulCount: number;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    create(userId: string, productId: string, dto: {
        rating: number;
        title?: string;
        body: string;
        images?: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        images: string[];
        productId: string;
        title: string | null;
        isApproved: boolean;
        body: string;
        rating: number;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    remove(userId: string, id: string, admin?: boolean): Promise<{
        message: string;
    }>;
    adminList(page?: number, limit?: number): Promise<{
        data: ({
            user: {
                email: string;
                firstName: string;
            };
            product: {
                name: string;
                slug: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            images: string[];
            productId: string;
            title: string | null;
            isApproved: boolean;
            body: string;
            rating: number;
            isVerified: boolean;
            helpfulCount: number;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    moderate(id: string, isApproved: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        images: string[];
        productId: string;
        title: string | null;
        isApproved: boolean;
        body: string;
        rating: number;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    private recalcRating;
}
