import { ProductStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class ProductImageDto {
    url: string;
    publicId?: string;
    alt?: string;
    isPrimary?: boolean;
    sortOrder?: number;
}
export declare class ProductVariantDto {
    sku: string;
    size?: string;
    color?: string;
    colorHex?: string;
    price?: number;
    stock?: number;
    imageUrl?: string;
}
export declare class CreateProductDto {
    name: string;
    slug?: string;
    description: string;
    shortDescription?: string;
    basePrice: number;
    compareAtPrice?: number;
    categoryId: string;
    collectionId?: string;
    status?: ProductStatus;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    isTrending?: boolean;
    tags?: string[];
    materials?: string;
    careInstructions?: string;
    images?: ProductImageDto[];
    variants?: ProductVariantDto[];
    seoTitle?: string;
    seoDescription?: string;
}
declare const UpdateProductDto_base: import("@nestjs/common").Type<Partial<CreateProductDto>>;
export declare class UpdateProductDto extends UpdateProductDto_base {
}
export declare class ProductQueryDto extends PaginationDto {
    category?: string;
    collection?: string;
    minPrice?: string;
    maxPrice?: string;
    sizes?: string;
    colors?: string;
    tags?: string;
    featured?: string;
    newArrival?: string;
    bestSeller?: string;
    trending?: string;
    status?: string;
}
export {};
