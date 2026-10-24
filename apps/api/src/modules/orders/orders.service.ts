import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { CartService } from '../cart/cart.service';
import { paginate, paginationMeta } from '../../common/dto/pagination.dto';
import { generateOrderNumber } from '../../common/utils/slug.util';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { QikinkService } from '../qikink/qikink.service';

/**
 * Allowed order status transitions.
 * CANCELLED and REFUNDED are terminal: no outgoing transitions exist, so no
 * status-update path (admin, webhook, fulfillment) can ever reactivate them.
 * RETURNED can only move to REFUNDED (the return-refund workflow).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.RETURNED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

/** Statuses that must never transition back into an active state. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.RETURNED,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly mail: MailService,
    @Inject(forwardRef(() => QikinkService))
    private readonly qikink: QikinkService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const cart = await this.cart.getCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    if (!address) throw new BadRequestException('Invalid shipping address');

    // Stock check
    for (const item of cart.items) {
      if (item.variantId && item.variant) {
        if (item.variant.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
        }
      }
    }

    const orderNumber = generateOrderNumber();
    const summary = cart.summary;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          paymentStatus:
            dto.paymentMethod === PaymentMethod.COD
              ? PaymentStatus.PENDING
              : PaymentStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          subtotal: summary.subtotal,
          discountAmount: summary.discountAmount,
          shippingAmount: summary.shippingAmount,
          taxAmount: summary.taxAmount,
          total: summary.total,
          couponCode: summary.couponCode || dto.couponCode,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId || dto.shippingAddressId,
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.product.name,
              variantLabel: [item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || null,
              sku: item.variant?.sku,
              imageUrl: item.product.images[0]?.url,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.lineTotal,
            })),
          },
          statusHistory: {
            create: { status: OrderStatus.PENDING, note: 'Order placed' },
          },
          payments: {
            create: {
              amount: summary.total,
              method: dto.paymentMethod,
              status: PaymentStatus.PENDING,
            },
          },
        },
        include: {
          items: true,
          shippingAddress: true,
          user: { select: { email: true, firstName: true } },
        },
      });

      // Decrement stock atomically, conditional on sufficient remaining stock.
      // The WHERE predicate re-checks stock after the row lock is acquired, so
      // two concurrent checkouts can never both claim the last available units:
      // the loser's guarded update matches no row, this transaction throws, and
      // the entire checkout (order, items, payment, history) rolls back.
      // Stock can never go negative.
      for (const item of cart.items) {
        if (item.variantId) {
          const decremented = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (!decremented.count) {
            throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
          }
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { totalSold: { increment: item.quantity } },
        });
      }

      if (summary.couponCode) {
        // Atomically claim one coupon usage inside the checkout transaction.
        // The WHERE predicate re-checks the limit after the row lock is acquired,
        // so two concurrent checkouts can never both claim the last available use.
        // A null usageLimit means unlimited usage. Any failure later in this
        // transaction rolls the claim back automatically.
        const coupon = await tx.coupon.findUnique({ where: { code: summary.couponCode } });
        if (!coupon || !coupon.isActive) {
          throw new BadRequestException('Invalid coupon');
        }
        const claimed = await tx.coupon.updateMany({
          where: {
            code: summary.couponCode,
            isActive: true,
            ...(coupon.usageLimit != null ? { usageCount: { lt: coupon.usageLimit } } : {}),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (!claimed.count) {
          throw new BadRequestException('Coupon usage limit reached');
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      // Auto-confirm COD
      if (dto.paymentMethod === PaymentMethod.COD) {
        await tx.order.update({
          where: { id: created.id },
          data: { status: OrderStatus.CONFIRMED },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: created.id,
            status: OrderStatus.CONFIRMED,
            note: 'COD order confirmed',
          },
        });
      }

      return created;
    });

    // Fire-and-forget: a slow/unreachable SMTP server must never block or fail order placement
this.mail
  .sendOrderConfirmation(order.user.email, order.orderNumber, String(order.total))
  .catch(() => undefined);

    // COD: confirmed immediately → queue Qikink fulfillment (idempotent)
    if (dto.paymentMethod === PaymentMethod.COD) {
      await this.qikink.enqueueOrderSubmission(order.id, 'cod_confirmed').catch(() => undefined);
    }

    return this.findOne(order.id, userId);
  }

  async findMyOrders(userId: string, query: OrderQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { skip, take } = paginate(page, limit);
    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) where.status = query.status as OrderStatus;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }

  async findOne(idOrNumber: string, userId?: string, admin = false) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        items: { include: { product: { select: { slug: true } } } },
        shippingAddress: true,
        billingAddress: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!admin && userId && order.userId !== userId) {
      throw new ForbiddenException();
    }
    return order;
  }

  async track(orderNumber: string, email?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        items: true,
        user: { select: { email: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (email && order.user.email.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException('Order not found');
    }
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      items: order.items,
      statusHistory: order.statusHistory,
    };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const status = dto.status as OrderStatus;
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    // Repeated transition to the same status: refresh tracking fields only.
    // Never creates a duplicate status-history entry.
    if (status === order.status) {
      const trackingOnly: Prisma.OrderUpdateInput = {};
      if (dto.trackingNumber) trackingOnly.trackingNumber = dto.trackingNumber;
      if (dto.carrier) trackingOnly.carrier = dto.carrier;
      if (Object.keys(trackingOnly).length) {
        await this.prisma.order.update({ where: { id }, data: trackingOnly });
      }
      return this.findOne(id, undefined, true);
    }

    const allowedTargets = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowedTargets.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} → ${status}`,
      );
    }

    const data: Prisma.OrderUpdateInput = { status };
    if (dto.trackingNumber) data.trackingNumber = dto.trackingNumber;
    if (dto.carrier) data.carrier = dto.carrier;
    if (status === OrderStatus.SHIPPED) data.shippedAt = new Date();
    if (status === OrderStatus.DELIVERED) {
      data.deliveredAt = new Date();
      data.paymentStatus =
        order.paymentMethod === PaymentMethod.COD ? PaymentStatus.PAID : order.paymentStatus;
    }
    if (status === OrderStatus.CANCELLED) data.cancelledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Atomic transition guard: the WHERE clause re-checks the status after the
      // row lock is acquired, so concurrent updates can never bypass the
      // transition map or double-apply side effects (restock / history).
      const updated = await tx.order.updateMany({
        where: { id, status: order.status },
        data,
      });
      if (!updated.count) {
        throw new BadRequestException(
          'Order status changed concurrently — refresh and retry',
        );
      }
      if (status === OrderStatus.CANCELLED) {
        // Restore inventory as part of the same transaction so cancellation is
        // transactionally consistent and can never restock twice.
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note: dto.note,
          createdBy: adminId,
        },
      });
    });
    return this.findOne(id, undefined, true);
  }

  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.findOne(id, userId);
    const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    await this.prisma.$transaction(async (tx) => {
      // Atomic guard: a repeated or concurrent cancel finds no row matching the
      // cancellable statuses, so it cannot restock or write history twice.
      const updated = await tx.order.updateMany({
        where: { id: order.id, userId, status: { in: cancellable } },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
      if (!updated.count) {
        throw new BadRequestException('Order cannot be cancelled at this stage');
      }
      // Restock inside the same transaction so a failed cancel rolls back the
      // inventory change.
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CANCELLED,
          note: reason || 'Cancelled by customer',
          createdBy: userId,
        },
      });
    });
    return this.findOne(order.id, userId);
  }

  async adminList(query: OrderQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { skip, take } = paginate(page, limit);
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status as OrderStatus;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: paginationMeta(total, page, limit) };
  }
}
