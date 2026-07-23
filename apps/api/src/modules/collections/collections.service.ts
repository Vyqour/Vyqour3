import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { slugify } from '../../common/utils/slug.util';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

const collectionInclude = {
  _count: { select: { products: true } },
} satisfies Prisma.CollectionInclude;

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async bust() {
    await this.redis.delByPattern('collections:*');
    await this.redis.delByPattern('products:*');
  }

  async findAll(includeInactive = false) {
    const cacheKey = `collections:all:${includeInactive}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const collections = await this.prisma.collection.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: collectionInclude,
    });
    await this.redis.set(cacheKey, collections, 600);
    return collections;
  }

  async findFeatured(limit = 8) {
    return this.prisma.collection.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: limit,
      include: collectionInclude,
    });
  }

  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        ...collectionInclude,
        products: {
          where: { status: 'ACTIVE' },
          take: 24,
          orderBy: { createdAt: 'desc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!collection || !collection.isActive) throw new NotFoundException('Collection not found');
    return collection;
  }

  async create(dto: CreateCollectionDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.prisma.collection.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Collection slug already exists');
    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        bannerUrl: dto.bannerUrl,
        featuredImageUrl: dto.featuredImageUrl,
        sortOrder: dto.sortOrder ?? 0,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
      },
      include: collectionInclude,
    });
    if (dto.productIds?.length) {
      await this.setProducts(collection.id, dto.productIds);
      return this.prisma.collection.findUniqueOrThrow({
        where: { id: collection.id },
        include: collectionInclude,
      });
    }
    await this.bust();
    return collection;
  }

  async update(id: string, dto: UpdateCollectionDto) {
    await this.ensureExists(id);
    if (dto.slug) {
      const clash = await this.prisma.collection.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) throw new ConflictException('Collection slug already exists');
    }

    const data: Prisma.CollectionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    else if (dto.name) data.slug = slugify(dto.name);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.bannerUrl !== undefined) data.bannerUrl = dto.bannerUrl;
    if (dto.featuredImageUrl !== undefined) data.featuredImageUrl = dto.featuredImageUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

    await this.prisma.collection.update({ where: { id }, data });
    if (dto.productIds !== undefined) {
      await this.setProducts(id, dto.productIds);
    } else {
      await this.bust();
    }
    return this.prisma.collection.findUniqueOrThrow({
      where: { id },
      include: collectionInclude,
    });
  }

  async setProducts(id: string, productIds: string[]) {
    await this.ensureExists(id);
    const unique = [...new Set(productIds.filter(Boolean))];
    await this.prisma.$transaction(async (tx) => {
      // Clear previous membership for this collection
      await tx.product.updateMany({
        where: { collectionId: id },
        data: { collectionId: null },
      });
      if (unique.length) {
        await tx.product.updateMany({
          where: { id: { in: unique } },
          data: { collectionId: id },
        });
      }
    });
    await this.bust();
    return this.prisma.collection.findUniqueOrThrow({
      where: { id },
      include: {
        ...collectionInclude,
        products: {
          select: { id: true, name: true, slug: true, status: true },
          take: 200,
        },
      },
    });
  }

  async listProducts(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.findMany({
      where: { collectionId: id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        basePrice: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      take: 200,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.collection.update({ where: { id }, data: { isActive: false } });
    await this.bust();
    return { message: 'Collection archived' };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.collection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  }
}
