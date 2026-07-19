import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
export declare class CategoriesController {
    private readonly categories;
    constructor(categories: CategoriesService);
    findAll(all?: string): Promise<{}>;
    findOne(slug: string): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            parentId: string | null;
            isActive: boolean;
            sortOrder: number;
            seoTitle: string | null;
            seoDescription: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            imageUrl: string | null;
            parentId: string | null;
            isActive: boolean;
            sortOrder: number;
            seoTitle: string | null;
            seoDescription: string | null;
        }[];
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        parentId: string | null;
        isActive: boolean;
        sortOrder: number;
        seoTitle: string | null;
        seoDescription: string | null;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        parentId: string | null;
        isActive: boolean;
        sortOrder: number;
        seoTitle: string | null;
        seoDescription: string | null;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        imageUrl: string | null;
        parentId: string | null;
        isActive: boolean;
        sortOrder: number;
        seoTitle: string | null;
        seoDescription: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
