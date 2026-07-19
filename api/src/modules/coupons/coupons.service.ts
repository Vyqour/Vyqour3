import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    code: string;
    description?: string;
    type: CouponType;
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    perUserLimit?: number;
    startsAt: string;
    expiresAt: string;
  }) {
    const code = data.code.toUpperCase();
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictException('Coupon code exists');
    return this.prisma.coupon.create({
      data: {
        code,
        description: data.description,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit ?? 1,
        startsAt: new Date(data.startsAt),
        expiresAt: new Date(data.expiresAt),
      },
    });
  }

  async list(page = 1, limit = 20) {
    const { skip, take } = paginate(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.coupon.count(),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async validate(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new NotFoundException('Invalid coupon');
    if (coupon.expiresAt < new Date() || coupon.startsAt > new Date()) {
      throw new NotFoundException('Coupon expired or not started');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new NotFoundException('Coupon exhausted');
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new NotFoundException(`Minimum order ₹${coupon.minOrderAmount}`);
    }
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else if (coupon.type === 'FIXED') {
      discount = Math.min(Number(coupon.value), subtotal);
    }
    return { coupon, discount: Math.round(discount * 100) / 100 };
  }

  async update(id: string, data: Prisma.CouponUpdateInput) {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { message: 'Coupon deactivated' };
  }
}
