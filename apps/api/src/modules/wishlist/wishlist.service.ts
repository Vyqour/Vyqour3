import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not found');
    try {
      return await this.prisma.wishlistItem.create({
        data: { userId, productId },
        include: { product: true },
      });
    } catch {
      throw new ConflictException('Already in wishlist');
    }
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { message: 'Removed from wishlist' };
  }

  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.remove(userId, productId);
      return { inWishlist: false };
    }
    await this.add(userId, productId);
    return { inWishlist: true };
  }
}
