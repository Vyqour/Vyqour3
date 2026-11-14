import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService dashboard', () => {
  const prisma = {
    order: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: null }, _count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    user: { count: jest.fn().mockResolvedValue(0) },
    product: { count: jest.fn().mockResolvedValue(0) },
    productVariant: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.order.count as jest.Mock).mockResolvedValue(0);
    (prisma.order.aggregate as jest.Mock).mockResolvedValue({
      _sum: { total: null },
      _count: 0,
    });
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
    (prisma.productVariant.count as jest.Mock).mockResolvedValue(0);
  });

  it('counts paid revenue only and excludes cancelled, refunded, and returned orders', async () => {
    const service = new AdminService(prisma);
    const result = await service.dashboard();
    const revenueFilter = {
      paymentStatus: PaymentStatus.PAID,
      status: {
        notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.RETURNED],
      },
    };

    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: revenueFilter }),
    );
    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining(revenueFilter),
      }),
    );
    expect(prisma.order.aggregate).toHaveBeenCalledTimes(9);
    expect(result.kpis.totalRevenue).toBe(0);
    expect(result.kpis.revenueMonth).toBe(0);
  });

  it('returns seven daily revenue buckets and empty collections when the store has no data', async () => {
    const service = new AdminService(prisma);
    const result = await service.dashboard();

    expect(result.revenueSeries).toHaveLength(7);
    expect(result.statusBreakdown).toEqual([]);
    expect(result.recentOrders).toEqual([]);
    expect(result.kpis.totalOrders).toBe(0);
  });
});
