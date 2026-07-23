import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { slugify } from '../../common/utils/slug.util';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(includeInactive = false) {
    const cacheKey = `categories:all:${includeInactive}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

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

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true,
        _count: { select: { products: true } },
      },
    });
    if (!category || !category.isActive) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.prisma.category.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Category slug already exists');
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
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
        isActive: dto.isActive ?? true,
      },
    });
    await this.redis.delByPattern('categories:*');
    await this.redis.delByPattern('products:*');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    if (dto.parentId) {
      if (dto.parentId === id) throw new ConflictException('Category cannot be its own parent');
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    if (dto.slug) {
      const clash = await this.prisma.category.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) throw new ConflictException('Category slug already exists');
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    else if (dto.name) data.slug = slugify(dto.name);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) data.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) data.seoDescription = dto.seoDescription;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.parentId !== undefined) {
      if (!dto.parentId) {
        data.parent = { disconnect: true };
      } else {
        data.parent = { connect: { id: dto.parentId } };
      }
    }

    const category = await this.prisma.category.update({ where: { id }, data });
    await this.redis.delByPattern('categories:*');
    await this.redis.delByPattern('products:*');
    return category;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    await this.redis.delByPattern('categories:*');
    await this.redis.delByPattern('products:*');
    return { message: 'Category archived' };
  }

  private async ensureExists(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}
