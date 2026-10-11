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
exports.CollectionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const slug_util_1 = require("../../common/utils/slug.util");
let CollectionsService = class CollectionsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async findAll(includeInactive = false) {
        const cacheKey = `collections:all:${includeInactive}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return cached;
        const collections = await this.prisma.collection.findMany({
            where: includeInactive ? undefined : { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { products: true } } },
        });
        await this.redis.set(cacheKey, collections, 600);
        return collections;
    }
    async findBySlug(slug) {
        const collection = await this.prisma.collection.findUnique({
            where: { slug },
            include: { _count: { select: { products: true } } },
        });
        if (!collection || !collection.isActive)
            throw new common_1.NotFoundException('Collection not found');
        return collection;
    }
    async create(dto) {
        const slug = dto.slug || (0, slug_util_1.slugify)(dto.name);
        const exists = await this.prisma.collection.findUnique({ where: { slug } });
        if (exists)
            throw new common_1.ConflictException('Collection slug already exists');
        const collection = await this.prisma.collection.create({
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                imageUrl: dto.imageUrl,
                sortOrder: dto.sortOrder ?? 0,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
                isActive: dto.isActive ?? true,
            },
        });
        await this.redis.delByPattern('collections:*');
        return collection;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        if (dto.slug) {
            const clash = await this.prisma.collection.findFirst({
                where: { slug: dto.slug, NOT: { id } },
            });
            if (clash)
                throw new common_1.ConflictException('Collection slug already exists');
        }
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.slug !== undefined)
            data.slug = dto.slug;
        else if (dto.name)
            data.slug = (0, slug_util_1.slugify)(dto.name);
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.imageUrl !== undefined)
            data.imageUrl = dto.imageUrl;
        if (dto.sortOrder !== undefined)
            data.sortOrder = dto.sortOrder;
        if (dto.seoTitle !== undefined)
            data.seoTitle = dto.seoTitle;
        if (dto.seoDescription !== undefined)
            data.seoDescription = dto.seoDescription;
        if (dto.isActive !== undefined)
            data.isActive = dto.isActive;
        const collection = await this.prisma.collection.update({ where: { id }, data });
        await this.redis.delByPattern('collections:*');
        await this.redis.delByPattern('products:*');
        return collection;
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.collection.update({ where: { id }, data: { isActive: false } });
        await this.redis.delByPattern('collections:*');
        await this.redis.delByPattern('products:*');
        return { message: 'Collection archived' };
    }
    async ensureExists(id) {
        const row = await this.prisma.collection.findUnique({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Collection not found');
        return row;
    }
};
exports.CollectionsService = CollectionsService;
exports.CollectionsService = CollectionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], CollectionsService);
//# sourceMappingURL=collections.service.js.map