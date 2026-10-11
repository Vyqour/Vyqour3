"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const slug_util_1 = require("../../common/utils/slug.util");
let BlogService = class BlogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(page = 1, limit = 9, publishedOnly = true) {
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = publishedOnly ? { isPublished: true } : {};
        const [data, total] = await Promise.all([
            this.prisma.blogPost.findMany({
                where,
                include: {
                    author: { select: { firstName: true, lastName: true, avatarUrl: true } },
                },
                orderBy: { publishedAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.blogPost.count({ where }),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async bySlug(slug) {
        const post = await this.prisma.blogPost.findUnique({
            where: { slug },
            include: {
                author: { select: { firstName: true, lastName: true, avatarUrl: true } },
            },
        });
        if (!post || !post.isPublished)
            throw new common_1.NotFoundException('Post not found');
        await this.prisma.blogPost.update({
            where: { id: post.id },
            data: { viewCount: { increment: 1 } },
        });
        return post;
    }
    async create(authorId, dto) {
        const slug = (0, slug_util_1.slugify)(dto.title) + '-' + Date.now().toString(36);
        return this.prisma.blogPost.create({
            data: {
                title: dto.title,
                slug,
                content: dto.content,
                excerpt: dto.excerpt,
                coverImage: dto.coverImage,
                tags: dto.tags || [],
                authorId,
                isPublished: dto.isPublished ?? false,
                publishedAt: dto.isPublished ? new Date() : null,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
            },
        });
    }
    async update(id, dto) {
        const data = { ...dto };
        if (dto.isPublished === true)
            data.publishedAt = new Date();
        return this.prisma.blogPost.update({ where: { id }, data });
    }
    async remove(id) {
        await this.prisma.blogPost.delete({ where: { id } });
        return { message: 'Post deleted' };
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlogService);
//# sourceMappingURL=blog.service.js.map