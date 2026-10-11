export declare class CreateCategoryDto {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
    sortOrder?: number;
    seoTitle?: string;
    seoDescription?: string;
    isActive?: boolean;
}
declare const UpdateCategoryDto_base: import("@nestjs/common").Type<Partial<CreateCategoryDto>>;
export declare class UpdateCategoryDto extends UpdateCategoryDto_base {
}
export {};
