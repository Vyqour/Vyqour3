import { ReviewsService } from './reviews.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class CreateReviewDto {
    rating: number;
    title?: string;
    body: string;
    images?: string[];
}
export declare class ReviewsController {
    private readonly reviews;
    constructor(reviews: ReviewsService);
    list(productId: string, page?: string, limit?: string): Promise<{
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
            rating: number;
            isApproved: boolean;
            body: string;
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
    create(user: AuthUser, productId: string, dto: CreateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        images: string[];
        productId: string;
        title: string | null;
        rating: number;
        isApproved: boolean;
        body: string;
        isVerified: boolean;
        helpfulCount: number;
    }>;
    remove(user: AuthUser, id: string): Promise<{
        message: string;
    }>;
    adminAll(page?: string, limit?: string): Promise<{
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
            rating: number;
            isApproved: boolean;
            body: string;
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
    moderate(id: string, body: {
        isApproved: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        images: string[];
        productId: string;
        title: string | null;
        rating: number;
        isApproved: boolean;
        body: string;
        isVerified: boolean;
        helpfulCount: number;
    }>;
}
export {};
