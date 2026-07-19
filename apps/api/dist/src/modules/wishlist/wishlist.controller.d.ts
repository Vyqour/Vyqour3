import { WishlistService } from './wishlist.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class WishlistController {
    private readonly wishlist;
    constructor(wishlist: WishlistService);
    list(user: AuthUser): Promise<({
        product: {
            category: {
                name: string;
                slug: string;
            };
            images: {
                id: string;
                sortOrder: number;
                url: string;
                publicId: string | null;
                alt: string | null;
                isPrimary: boolean;
                productId: string;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ProductStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string;
            seoTitle: string | null;
            seoDescription: string | null;
            sku: string | null;
            shortDescription: string | null;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            barcode: string | null;
            categoryId: string;
            isFeatured: boolean;
            isNewArrival: boolean;
            isBestSeller: boolean;
            isTrending: boolean;
            tags: string[];
            materials: string | null;
            careInstructions: string | null;
            weightGrams: number | null;
            seoKeywords: string[];
            averageRating: number;
            reviewCount: number;
            totalSold: number;
            viewCount: number;
            qikinkSku: string | null;
            qikinkProductId: string | null;
            qikinkPrintTypeId: number;
            qikinkDesignCode: string | null;
            qikinkDesignUrl: string | null;
            qikinkMockupUrl: string | null;
            qikinkPlacementSku: string | null;
            qikinkSearchFromMyProducts: number;
            qikinkSyncedAt: Date | null;
            publishedAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        productId: string;
    })[]>;
    add(user: AuthUser, productId: string): Promise<{
        product: {
            id: string;
            status: import(".prisma/client").$Enums.ProductStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string;
            seoTitle: string | null;
            seoDescription: string | null;
            sku: string | null;
            shortDescription: string | null;
            basePrice: import("@prisma/client/runtime/library").Decimal;
            compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
            costPrice: import("@prisma/client/runtime/library").Decimal | null;
            barcode: string | null;
            categoryId: string;
            isFeatured: boolean;
            isNewArrival: boolean;
            isBestSeller: boolean;
            isTrending: boolean;
            tags: string[];
            materials: string | null;
            careInstructions: string | null;
            weightGrams: number | null;
            seoKeywords: string[];
            averageRating: number;
            reviewCount: number;
            totalSold: number;
            viewCount: number;
            qikinkSku: string | null;
            qikinkProductId: string | null;
            qikinkPrintTypeId: number;
            qikinkDesignCode: string | null;
            qikinkDesignUrl: string | null;
            qikinkMockupUrl: string | null;
            qikinkPlacementSku: string | null;
            qikinkSearchFromMyProducts: number;
            qikinkSyncedAt: Date | null;
            publishedAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        productId: string;
    }>;
    toggle(user: AuthUser, productId: string): Promise<{
        inWishlist: boolean;
    }>;
    remove(user: AuthUser, productId: string): Promise<{
        message: string;
    }>;
}
