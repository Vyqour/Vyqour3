import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/slug.util';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 9, publishedOnly = true) {
    const { skip, take } = paginate(page, limit);
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
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async bySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!post || !post.isPublished) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
    return post;
  }

  async create(
    authorId: string,
    dto: {
      title: string;
      content: string;
      excerpt?: string;
      coverImage?: string;
      tags?: string[];
      isPublished?: boolean;
      seoTitle?: string;
      seoDescription?: string;
    },
  ) {
    const slug = slugify(dto.title) + '-' + Date.now().toString(36);
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

  async update(id: string, dto: Record<string, unknown>) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.isPublished === true) data.publishedAt = new Date();
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { message: 'Post deleted' };
  }
}
