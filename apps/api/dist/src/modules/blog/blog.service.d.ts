import { PrismaService } from '../../prisma/prisma.service';
export declare class BlogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(page?: number, limit?: number, publishedOnly?: boolean): Promise<{
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
    bySlug(slug: string): Promise<{
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
    create(authorId: string, dto: {
        title: string;
        content: string;
        excerpt?: string;
        coverImage?: string;
        tags?: string[];
        isPublished?: boolean;
        seoTitle?: string;
        seoDescription?: string;
    }): Promise<{
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
    update(id: string, dto: Record<string, unknown>): Promise<{
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
