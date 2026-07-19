import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.name && !dto.slug) data.slug = slugify(dto.name);
    const category = await this.prisma.category.update({ where: { id }, data });
    await this.redis.delByPattern('categories:*');
    return category;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    await this.redis.delByPattern('categories:*');
    return { message: 'Category archived' };
  }

  private async ensureExists(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}
