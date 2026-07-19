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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const slug_util_1 = require("../../common/utils/slug.util");
let CategoriesService = class CategoriesService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async findAll(includeInactive = false) {
        const cacheKey = `categories:all:${includeInactive}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return cached;
        const categories = await this.prisma.category.findMany({
            where: includeInactive ? undefined : { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: {
                children: {
                    where: includeInactive ? undefined : { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                },
                _count: { select: { products: true } },
            },
        });
        const roots = categories.filter((c) => !c.parentId);
        await this.redis.set(cacheKey, roots, 600);
        return roots;
    }
    async findBySlug(slug) {
        const category = await this.prisma.category.findUnique({
            where: { slug },
            include: {
                children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
                parent: true,
                _count: { select: { products: true } },
            },
        });
        if (!category || !category.isActive)
            throw new common_1.NotFoundException('Category not found');
        return category;
    }
    async create(dto) {
        const slug = dto.slug || (0, slug_util_1.slugify)(dto.name);
        const exists = await this.prisma.category.findUnique({ where: { slug } });
        if (exists)
            throw new common_1.ConflictException('Category slug already exists');
        const category = await this.prisma.category.create({
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                imageUrl: dto.imageUrl,
                parentId: dto.parentId,
                sortOrder: dto.sortOrder ?? 0,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
            },
        });
        await this.redis.delByPattern('categories:*');
        return category;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        const data = { ...dto };
        if (dto.name && !dto.slug)
            data.slug = (0, slug_util_1.slugify)(dto.name);
        const category = await this.prisma.category.update({ where: { id }, data });
        await this.redis.delByPattern('categories:*');
        return category;
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.category.update({ where: { id }, data: { isActive: false } });
        await this.redis.delByPattern('categories:*');
        return { message: 'Category archived' };
    }
    async ensureExists(id) {
        const cat = await this.prisma.category.findUnique({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException('Category not found');
        return cat;
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map