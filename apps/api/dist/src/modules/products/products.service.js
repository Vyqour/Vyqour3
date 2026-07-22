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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const slug_util_1 = require("../../common/utils/slug.util");
const productInclude = {
    images: { orderBy: { sortOrder: 'asc' } },
    variants: { where: { isActive: true } },
    category: { select: { id: true, name: true, slug: true } },
    collection: { select: { id: true, name: true, slug: true } },
    inventory: true,
};
let ProductsService = class ProductsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async findAll(query, admin = false) {
        const page = query.page || 1;
        const limit = query.limit || 12;
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = {};
        if (!admin)
            where.status = client_1.ProductStatus.ACTIVE;
        else if (query.status)
            where.status = query.status;
        if (query.category) {
            where.category = { slug: query.category };
        }
        if (query.collection) {
            where.collection = { slug: query.collection };
        }
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
                { tags: { has: query.search.toLowerCase() } },
            ];
        }
        if (query.minPrice || query.maxPrice) {
            where.basePrice = {};
            if (query.minPrice)
                where.basePrice.gte = query.minPrice;
            if (query.maxPrice)
                where.basePrice.lte = query.maxPrice;
        }
        if (query.featured === 'true')
            where.isFeatured = true;
        if (query.newArrival === 'true')
            where.isNewArrival = true;
        if (query.bestSeller === 'true')
            where.isBestSeller = true;
        if (query.trending === 'true')
            where.isTrending = true;
        if (query.tags) {
            where.tags = { hasSome: query.tags.split(',').map((t) => t.trim()) };
        }
        if (query.sizes) {
            where.variants = { some: { size: { in: query.sizes.split(',') }, isActive: true } };
        }
        if (query.colors) {
            where.variants = {
                some: {
                    ...where.variants?.some,
                    color: { in: query.colors.split(',') },
                    isActive: true,
                },
            };
        }
        const sortMap = {
            price_asc: { basePrice: 'asc' },
            price_desc: { basePrice: 'desc' },
            newest: { createdAt: 'desc' },
            popular: { totalSold: 'desc' },
            rating: { averageRating: 'desc' },
            name: { name: 'asc' },
        };
        const orderBy = (query.sortBy && sortMap[query.sortBy]) ||
            { createdAt: query.sortOrder || 'desc' };
        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: productInclude,
                orderBy,
                skip,
                take,
            }),
            this.prisma.product.count({ where }),
        ]);
        return { data: items, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async findBySlug(slug, userId) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            include: {
                ...productInclude,
                reviews: {
                    where: { isApproved: true },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
            },
        });
        if (!product || product.status === client_1.ProductStatus.ARCHIVED) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.status !== client_1.ProductStatus.ACTIVE && !userId) {
            throw new common_1.NotFoundException('Product not found');
        }
        await this.prisma.product.update({
            where: { id: product.id },
            data: { viewCount: { increment: 1 } },
        });
        if (userId) {
            await this.prisma.recentlyViewed.upsert({
                where: { userId_productId: { userId, productId: product.id } },
                create: { userId, productId: product.id },
                update: { viewedAt: new Date() },
            });
        }
        return product;
    }
    async related(productId, limit = 8) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            return [];
        return this.prisma.product.findMany({
            where: {
                status: client_1.ProductStatus.ACTIVE,
                categoryId: product.categoryId,
                id: { not: productId },
            },
            include: productInclude,
            take: limit,
            orderBy: { totalSold: 'desc' },
        });
    }
    async create(dto) {
        let slug = dto.slug || (0, slug_util_1.slugify)(dto.name);
        const existing = await this.prisma.product.findUnique({ where: { slug } });
        if (existing)
            slug = `${slug}-${Date.now().toString(36)}`;
        const product = await this.prisma.product.create({
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                shortDescription: dto.shortDescription,
                basePrice: dto.basePrice,
                compareAtPrice: dto.compareAtPrice,
                categoryId: dto.categoryId,
                collectionId: dto.collectionId || undefined,
                status: dto.status || client_1.ProductStatus.DRAFT,
                isFeatured: dto.isFeatured ?? false,
                isNewArrival: dto.isNewArrival ?? false,
                isBestSeller: dto.isBestSeller ?? false,
                isTrending: dto.isTrending ?? false,
                tags: dto.tags || [],
                materials: dto.materials,
                careInstructions: dto.careInstructions,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
                publishedAt: dto.status === client_1.ProductStatus.ACTIVE ? new Date() : null,
                images: dto.images?.length
                    ? {
                        create: dto.images.map((img, i) => ({
                            url: img.url,
                            publicId: img.publicId,
                            alt: img.alt || dto.name,
                            isPrimary: img.isPrimary ?? i === 0,
                            sortOrder: img.sortOrder ?? i,
                        })),
                    }
                    : undefined,
                variants: dto.variants?.length
                    ? {
                        create: dto.variants.map((v) => ({
                            sku: v.sku,
                            size: v.size,
                            color: v.color,
                            colorHex: v.colorHex,
                            price: v.price,
                            stock: v.stock ?? 0,
                            imageUrl: v.imageUrl,
                        })),
                    }
                    : undefined,
                inventory: {
                    create: {
                        quantity: dto.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0,
                    },
                },
            },
            include: productInclude,
        });
        await this.redis.delByPattern('products:*');
        return product;
    }
    async update(id, dto) {
        const existing = await this.prisma.product.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Product not found');
        const data = {
            name: dto.name,
            description: dto.description,
            shortDescription: dto.shortDescription,
            basePrice: dto.basePrice,
            compareAtPrice: dto.compareAtPrice,
            status: dto.status,
            isFeatured: dto.isFeatured,
            isNewArrival: dto.isNewArrival,
            isBestSeller: dto.isBestSeller,
            isTrending: dto.isTrending,
            tags: dto.tags,
            materials: dto.materials,
            careInstructions: dto.careInstructions,
            seoTitle: dto.seoTitle,
            seoDescription: dto.seoDescription,
        };
        if (dto.categoryId)
            data.category = { connect: { id: dto.categoryId } };
        if (dto.collectionId !== undefined) {
            if (!dto.collectionId)
                data.collection = { disconnect: true };
            else
                data.collection = { connect: { id: dto.collectionId } };
        }
        if (dto.name && !dto.slug)
            data.slug = (0, slug_util_1.slugify)(dto.name);
        if (dto.slug)
            data.slug = dto.slug;
        if (dto.status === client_1.ProductStatus.ACTIVE && !existing.publishedAt) {
            data.publishedAt = new Date();
        }
        const product = await this.prisma.product.update({
            where: { id },
            data,
            include: productInclude,
        });
        await this.redis.delByPattern('products:*');
        return product;
    }
    async remove(id, hard = false) {
        const existing = await this.prisma.product.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Product not found');
        if (hard) {
            await this.prisma.$transaction(async (tx) => {
                await tx.productImage.deleteMany({ where: { productId: id } });
                await tx.productVariant.deleteMany({ where: { productId: id } });
                await tx.inventory.deleteMany({ where: { productId: id } });
                await tx.recentlyViewed.deleteMany({ where: { productId: id } });
                await tx.review.deleteMany({ where: { productId: id } });
                await tx.cartItem.deleteMany({ where: { productId: id } });
                await tx.wishlistItem.deleteMany({ where: { productId: id } });
                const ordered = await tx.orderItem.count({ where: { productId: id } });
                if (ordered > 0) {
                    throw new common_1.ConflictException('Cannot permanently delete a product that appears on orders. Archive it instead.');
                }
                await tx.product.delete({ where: { id } });
            });
            await this.redis.delByPattern('products:*');
            return { message: 'Product deleted permanently' };
        }
        await this.prisma.product.update({
            where: { id },
            data: { status: client_1.ProductStatus.ARCHIVED },
        });
        await this.redis.delByPattern('products:*');
        return { message: 'Product archived' };
    }
    async homeSections() {
        const cacheKey = 'products:home';
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return cached;
        const base = {
            where: { status: client_1.ProductStatus.ACTIVE },
            include: productInclude,
            take: 8,
        };
        const [featured, newArrivals, trending, bestSellers] = await Promise.all([
            this.prisma.product.findMany({ ...base, where: { ...base.where, isFeatured: true } }),
            this.prisma.product.findMany({
                ...base,
                where: { ...base.where, isNewArrival: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.product.findMany({ ...base, where: { ...base.where, isTrending: true } }),
            this.prisma.product.findMany({
                ...base,
                where: { ...base.where, isBestSeller: true },
                orderBy: { totalSold: 'desc' },
            }),
        ]);
        const result = { featured, newArrivals, trending, bestSellers };
        await this.redis.set(cacheKey, result, 300);
        return result;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], ProductsService);
//# sourceMappingURL=products.service.js.map