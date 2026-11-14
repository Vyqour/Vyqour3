import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    // Use UTC boundaries so the same dashboard day is used regardless of
    // the timezone configured on the API host.
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const revenueWhere = {
      paymentStatus: PaymentStatus.PAID,
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.RETURNED] },
    };

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
        where: revenueWhere,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...revenueWhere, createdAt: { gte: startOfMonth } },
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

    // Last seven UTC calendar days, including today.
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(startOfDay);
      day.setUTCDate(day.getUTCDate() - (6 - index));
      return day;
    });

    const revenueSeries = await Promise.all(
      days.map(async (day) => {
        const next = new Date(day);
        next.setUTCDate(next.getUTCDate() + 1);
        const aggregate = await this.prisma.order.aggregate({
          where: {
            ...revenueWhere,
            createdAt: { gte: day, lt: next },
          },
          _sum: { total: true },
          _count: true,
        });
        return {
          date: day.toISOString().slice(0, 10),
          revenue: Number(aggregate._sum.total || 0),
          orders: aggregate._count,
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
      statusBreakdown: statusBreakdown.map((status) => ({
        status: status.status,
        count: status._count,
      })),
      revenueSeries,
      recentOrders,
    };
  }
}
