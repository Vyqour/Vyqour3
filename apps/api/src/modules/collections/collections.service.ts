import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { slugify } from '../../common/utils/slug.util';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(includeInactive = false) {
    const cacheKey = `collections:all:${includeInactive}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const collections = await this.prisma.collection.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    await this.redis.set(cacheKey, collections, 600);
    return collections;
  }

  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
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
        sortOrder: dto.sortOrder ?? 0,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        isActive: dto.isActive ?? true,
      },
    });
    await this.redis.delByPattern('collections:*');
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
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const collection = await this.prisma.collection.update({ where: { id }, data });
    await this.redis.delByPattern('collections:*');
    await this.redis.delByPattern('products:*');
    return collection;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.collection.update({ where: { id }, data: { isActive: false } });
    await this.redis.delByPattern('collections:*');
    await this.redis.delByPattern('products:*');
    return { message: 'Collection archived' };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.collection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  }
}
