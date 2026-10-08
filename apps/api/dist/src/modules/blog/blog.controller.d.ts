import { BlogService } from './blog.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class CreatePostDto {
    title: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    tags?: string[];
    isPublished?: boolean;
    seoTitle?: string;
    seoDescription?: string;
}
export declare class BlogController {
    private readonly blog;
    constructor(blog: BlogService);
    list(page?: string, limit?: string): Promise<{
        data: ({
            author: {
                firstName: string;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            seoTitle: string | null;
            seoDescription: string | null;
            tags: string[];
            viewCount: number;
            publishedAt: Date | null;
            title: string;
            excerpt: string | null;
            content: string;
            coverImage: string | null;
            authorId: string;
            isPublished: boolean;
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
    one(slug: string): Promise<{
        author: {
            firstName: string;
            lastName: string | null;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        seoTitle: string | null;
        seoDescription: string | null;
        tags: string[];
        viewCount: number;
        publishedAt: Date | null;
        title: string;
        excerpt: string | null;
        content: string;
        coverImage: string | null;
        authorId: string;
        isPublished: boolean;
    }>;
    adminAll(page?: string): Promise<{
        data: ({
            author: {
                firstName: string;
                lastName: string | null;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            seoTitle: string | null;
            seoDescription: string | null;
            tags: string[];
            viewCount: number;
            publishedAt: Date | null;
            title: string;
            excerpt: string | null;
            content: string;
            coverImage: string | null;
            authorId: string;
            isPublished: boolean;
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
    create(user: AuthUser, dto: CreatePostDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        seoTitle: string | null;
        seoDescription: string | null;
        tags: string[];
        viewCount: number;
        publishedAt: Date | null;
        title: string;
        excerpt: string | null;
        content: string;
        coverImage: string | null;
        authorId: string;
        isPublished: boolean;
    }>;
    update(id: string, dto: Partial<CreatePostDto>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        seoTitle: string | null;
        seoDescription: string | null;
        tags: string[];
        viewCount: number;
        publishedAt: Date | null;
        title: string;
        excerpt: string | null;
        content: string;
        coverImage: string | null;
        authorId: string;
        isPublished: boolean;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
export {};
