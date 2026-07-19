import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOrders,
      ordersToday,
      ordersMonth,
      revenueAgg,
      revenueMonthAgg,
      customers,
      products,
      lowStock,
      recentOrders,
      statusBreakdown,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.productVariant.count({ where: { stock: { lte: 5 }, isActive: true } }),
      this.prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, email: true } },
          items: true,
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Last 7 days revenue
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const revenueSeries = await Promise.all(
      days.map(async (day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const agg = await this.prisma.order.aggregate({
          where: {
            createdAt: { gte: day, lt: next },
            status: { not: OrderStatus.CANCELLED },
          },
          _sum: { total: true },
          _count: true,
        });
        return {
          date: day.toISOString().slice(0, 10),
          revenue: Number(agg._sum.total || 0),
          orders: agg._count,
        };
      }),
    );

    return {
      kpis: {
        totalOrders,
        ordersToday,
        ordersMonth,
        totalRevenue: Number(revenueAgg._sum.total || 0),
        revenueMonth: Number(revenueMonthAgg._sum.total || 0),
        customers,
        activeProducts: products,
        lowStockVariants: lowStock,
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      revenueSeries,
      recentOrders,
    };
  }
}
