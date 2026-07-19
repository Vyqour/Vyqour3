import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProduct(productId: string, page = 1, limit = 10) {
    const { skip, take } = paginate(page, limit);
    const where = { productId, isApproved: true };
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async create(
    userId: string,
    productId: string,
    dto: { rating: number; title?: string; body: string; images?: string[] },
  ) {
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be 1-5');
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] } },
      },
    });

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        images: dto.images || [],
        isVerified: !!purchased,
        isApproved: true,
      },
    });
    await this.recalcRating(productId);
    return review;
  }

  async remove(userId: string, id: string, admin = false) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (!admin && review.userId !== userId) throw new ForbiddenException();
    await this.prisma.review.delete({ where: { id } });
    await this.recalcRating(review.productId);
    return { message: 'Review deleted' };
  }

  async adminList(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        include: {
          user: { select: { email: true, firstName: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count(),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async moderate(id: string, isApproved: boolean) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { isApproved },
    });
    await this.recalcRating(review.productId);
    return review;
  }

  private async recalcRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: agg._avg.rating || 0,
        reviewCount: agg._count,
      },
    });
  }
}
