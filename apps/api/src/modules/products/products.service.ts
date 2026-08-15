import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/slug.util';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { isActive: true } },
  category: { select: { id: true, name: true, slug: true } },
  collection: { select: { id: true, name: true, slug: true } },
  inventory: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: ProductQueryDto, admin = false) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const { skip, take } = paginate(page, limit);

    const where: Prisma.ProductWhereInput = {};
    if (!admin) where.status = ProductStatus.ACTIVE;
    else if (query.status) where.status = query.status as ProductStatus;

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
      if (query.minPrice) {
        const min = Number(query.minPrice);
        if (!Number.isNaN(min)) where.basePrice.gte = min;
      }
      if (query.maxPrice) {
        const max = Number(query.maxPrice);
        if (!Number.isNaN(max)) where.basePrice.lte = max;
      }
    }
    if (query.featured === 'true') where.isFeatured = true;
    if (query.newArrival === 'true') where.isNewArrival = true;
    if (query.bestSeller === 'true') where.isBestSeller = true;
    if (query.trending === 'true') where.isTrending = true;
    if (query.tags) {
      where.tags = { hasSome: query.tags.split(',').map((t) => t.trim()) };
    }
    if (query.sizes) {
      where.variants = {
        some: { size: { in: query.sizes.split(',') }, isActive: true },
      };
    }
    if (query.colors) {
      where.variants = {
        some: {
          ...(where.variants as Prisma.ProductVariantListRelationFilter)?.some,
          color: { in: query.colors.split(',') },
          isActive: true,
        },
      };
    }

    const sortMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      price_asc: { basePrice: 'asc' },
      price_desc: { basePrice: 'desc' },
      newest: { createdAt: 'desc' },
      popular: { totalSold: 'desc' },
      rating: { averageRating: 'desc' },
      name: { name: 'asc' },
    };
    const orderBy =
      (query.sortBy && sortMap[query.sortBy]) ||
      ({
        createdAt: query.sortOrder || 'desc',
      } as Prisma.ProductOrderByWithRelationInput);

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

    return { data: items, meta: paginationMeta(total, page, limit) };
  }

  async findBySlug(slug: string, userId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        ...productInclude,
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    if (!product || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== ProductStatus.ACTIVE && !userId) {
      throw new NotFoundException('Product not found');
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

  async related(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return [];
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        categoryId: product.categoryId,
        id: { not: productId },
      },
      include: productInclude,
      take: limit,
      orderBy: { totalSold: 'desc' },
    });
  }

  async create(dto: CreateProductDto) {
    let slug = dto.slug || slugify(dto.name);
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

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
        status: dto.status || ProductStatus.DRAFT,
        isFeatured: dto.isFeatured ?? false,
        isNewArrival: dto.isNewArrival ?? false,
        isBestSeller: dto.isBestSeller ?? false,
        isTrending: dto.isTrending ?? false,
        tags: dto.tags || [],
        materials: dto.materials,
        careInstructions: dto.careInstructions,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        qikinkSku: dto.qikinkSku,
        qikinkPrintTypeId: 1, // DTG only — fixed for all products
        qikinkDesigns: dto.qikinkDesigns as unknown as Prisma.InputJsonValue,
        qikinkSearchFromMyProducts: dto.qikinkSearchFromMyProducts,
        publishedAt: dto.status === ProductStatus.ACTIVE ? new Date() : null,
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
            quantity:
              dto.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0,
          },
        },
      },
      include: productInclude,
    });
    await this.redis.delByPattern('products:*');
    await this.redis.delByPattern('categories:*');
    await this.redis.delByPattern('collections:*');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductUpdateInput = {
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
        qikinkSku: dto.qikinkSku,
        qikinkPrintTypeId: 1, // DTG only — fixed for all products
        qikinkDesigns: dto.qikinkDesigns as unknown as Prisma.InputJsonValue,
        qikinkSearchFromMyProducts: dto.qikinkSearchFromMyProducts,
      };
      if (dto.categoryId) data.category = { connect: { id: dto.categoryId } };
      if (dto.collectionId !== undefined) {
        if (!dto.collectionId) data.collection = { disconnect: true };
        else data.collection = { connect: { id: dto.collectionId } };
      }
      if (dto.name && !dto.slug) data.slug = slugify(dto.name);
      if (dto.slug) data.slug = dto.slug;
      if (dto.status === ProductStatus.ACTIVE && !existing.publishedAt) {
        data.publishedAt = new Date();
      }

      await tx.product.update({ where: { id }, data });

      // Replace images when provided (admin product editor sends full set)
      if (dto.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (dto.images.length) {
          await tx.productImage.createMany({
            data: dto.images.map((img, i) => ({
              productId: id,
              url: img.url,
              publicId: img.publicId,
              alt: img.alt || dto.name || existing.name,
              isPrimary: img.isPrimary ?? i === 0,
              sortOrder: img.sortOrder ?? i,
            })),
          });
        }
      }

      // Replace variants when provided
      if (dto.variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (dto.variants.length) {
          await tx.productVariant.createMany({
            data: dto.variants.map((v) => ({
              productId: id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              price: v.price,
              stock: v.stock ?? 0,
              imageUrl: v.imageUrl,
              isActive: true,
            })),
          });
          const qty = dto.variants.reduce((s, v) => s + (v.stock || 0), 0);
          await tx.inventory.upsert({
            where: { productId: id },
            create: { productId: id, quantity: qty },
            update: { quantity: qty },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });

    await this.redis.delByPattern('products:*');
    await this.redis.delByPattern('categories:*');
    await this.redis.delByPattern('collections:*');
    return product;
  }

  async remove(id: string, hard = false) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    if (hard) {
      await this.prisma.$transaction(async (tx) => {
        // Clear relations that block hard delete (order items keep historical productId nullable? detach)
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.inventory.deleteMany({ where: { productId: id } });
        await tx.recentlyViewed.deleteMany({ where: { productId: id } });
        await tx.review.deleteMany({ where: { productId: id } });
        await tx.cartItem.deleteMany({ where: { productId: id } });
        await tx.wishlistItem.deleteMany({ where: { productId: id } });
        // Order line items are historical — null product link if schema allows; otherwise keep and block
        // OrderItem.productId is required without onDelete Cascade, so refuse hard delete when ordered.
        const ordered = await tx.orderItem.count({ where: { productId: id } });
        if (ordered > 0) {
          throw new ConflictException(
            'Cannot permanently delete a product that appears on orders. Archive it instead.',
          );
        }
        await tx.product.delete({ where: { id } });
      });
      await this.redis.delByPattern('products:*');
      return { message: 'Product deleted permanently' };
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
    await this.redis.delByPattern('products:*');
    return { message: 'Product archived' };
  }

  async homeSections() {
    const cacheKey = 'products:home';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const base = {
      where: { status: ProductStatus.ACTIVE },
      include: productInclude,
      take: 8,
    };
    const [featured, newArrivals, trending, bestSellers] = await Promise.all([
      this.prisma.product.findMany({
        ...base,
        where: { ...base.where, isFeatured: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.findMany({
        ...base,
        where: { ...base.where, isNewArrival: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.findMany({
        ...base,
        where: { ...base.where, isTrending: true },
        orderBy: { updatedAt: 'desc' },
      }),
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
}
