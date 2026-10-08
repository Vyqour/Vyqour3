export declare class CreateCollectionDto {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    seoTitle?: string;
    seoDescription?: string;
    isActive?: boolean;
}
declare const UpdateCollectionDto_base: import("@nestjs/common").Type<Partial<CreateCollectionDto>>;
export declare class UpdateCollectionDto extends UpdateCollectionDto_base {
}
export {};
