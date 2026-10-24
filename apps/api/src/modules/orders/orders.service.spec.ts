import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService - terminal protection, transitions, inventory, coupon claims', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockCart: any;
  let mockMail: any;
  let mockQikink: any;

  const baseOrder = {
    id: 'order_1',
    orderNumber: 'VYQ10001',
    userId: 'user_1',
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.RAZORPAY,
    items: [
      { id: 'item_1', variantId: 'variant_1', productId: 'prod_1', quantity: 2, productName: 'Tee' },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      orderStatusHistory: { create: jest.fn() },
      productVariant: { update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      product: { update: jest.fn() },
      coupon: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      address: { findFirst: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      cart: { update: jest.fn() },
      $transaction: jest.fn(async (arg: any) =>
        typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg),
      ),
    };
    mockCart = { getCart: jest.fn() };
    mockMail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
    mockQikink = { enqueueOrderSubmission: jest.fn().mockResolvedValue({ queued: true }) };

    service = new OrdersService(mockPrisma, mockCart as any, mockMail as any, mockQikink as any);
  });

  describe('updateStatus - terminal and transition protection', () => {
    beforeEach(() => {
      // final findOne(id, undefined, true) resolves through order.findFirst
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    });

    it('rejects reactivating a CANCELLED order (terminal state)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.CANCELLED });

      await expect(
        service.updateStatus('order_1', { status: 'CONFIRMED' }, 'admin_1'),
      ).rejects.toThrow('Invalid status transition: CANCELLED → CONFIRMED');

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    it('rejects reactivating a REFUNDED order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.REFUNDED });

      await expect(
        service.updateStatus('order_1', { status: 'PROCESSING' }, 'admin_1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('rejects moving a RETURNED order back to an active state', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.RETURNED });

      await expect(
        service.updateStatus('order_1', { status: 'SHIPPED' }, 'admin_1'),
      ).rejects.toThrow('Invalid status transition: RETURNED → SHIPPED');
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('allows the valid RETURNED → REFUNDED refund workflow', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.RETURNED });
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder, status: OrderStatus.REFUNDED });

      await service.updateStatus('order_1', { status: 'REFUNDED' }, 'admin_1');

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1', status: OrderStatus.RETURNED },
          data: expect.objectContaining({ status: OrderStatus.REFUNDED }),
        }),
      );
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
    });

    it('rejects status regressions (DELIVERED → SHIPPED)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.DELIVERED });

      await expect(
        service.updateStatus('order_1', { status: 'SHIPPED' }, 'admin_1'),
      ).rejects.toThrow('Invalid status transition: DELIVERED → SHIPPED');
    });

    it('enforces the transition atomically: concurrent status change -> no write, no history', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.CONFIRMED });
      // The guarded update finds no row: another request changed the status first
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateStatus('order_1', { status: 'PROCESSING' }, 'admin_1'),
      ).rejects.toThrow('Order status changed concurrently — refresh and retry');

      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.productVariant.update).not.toHaveBeenCalled();
    });

    it('repeated same-status update does not create duplicate history entries', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.SHIPPED });

      await service.updateStatus('order_1', { status: 'SHIPPED' }, 'admin_1');

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    it('admin cancellation restores inventory exactly once, inside the transaction', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder, status: OrderStatus.CONFIRMED });

      await service.updateStatus('order_1', { status: 'CANCELLED' }, 'admin_1');

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1', status: OrderStatus.CONFIRMED },
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelledAt: expect.any(Date),
          }),
        }),
      );
      expect(mockPrisma.productVariant.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'variant_1' },
        data: { stock: { increment: 2 } },
      });
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown status value', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...baseOrder });

      await expect(
        service.updateStatus('order_1', { status: 'TELEPORTED' }, 'admin_1'),
      ).rejects.toThrow('Invalid status');
    });
  });

  describe('cancel - atomic guard, single restock', () => {
    beforeEach(() => {
      // findOne resolves through order.findFirst with ownership check
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    });

    it('cancels a CONFIRMED order: guarded update, one restock, one history row', async () => {
      const res = await service.cancel('order_1', 'user_1', 'changed my mind');

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'order_1',
          userId: 'user_1',
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
        data: expect.objectContaining({
          status: OrderStatus.CANCELLED,
          cancelReason: 'changed my mind',
        }),
      });
      expect(mockPrisma.productVariant.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(res).toBeDefined();
    });

    it('repeated cancellation cannot restock or write history twice', async () => {
      await service.cancel('order_1', 'user_1');
      // Second attempt: the guard matches no row because status is now CANCELLED
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('order_1', 'user_1')).rejects.toThrow(
        'Order cannot be cancelled at this stage',
      );

      expect(mockPrisma.productVariant.update).toHaveBeenCalledTimes(1); // only first cancel
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledTimes(1); // only first cancel
    });

    it('cannot cancel another user\'s order even if the status check passes', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder, userId: 'someone_else' });

      await expect(service.cancel('order_1', 'user_1')).rejects.toThrow(); // ownership check in findOne
    });
  });

  describe('create - atomic coupon usage claims', () => {
    const cartItem = {
      id: 'ci_1',
      productId: 'prod_1',
      variantId: 'variant_1',
      quantity: 1,
      unitPrice: 500,
      lineTotal: 500,
      product: { name: 'Tee', images: [] },
      variant: { stock: 10, size: 'M', color: null, sku: 'TEE-M', price: 500 },
    };

    function cartWithCoupon(couponCode: string | null) {
      return {
        id: 'cart_1',
        items: [cartItem],
        summary: {
          subtotal: 500,
          discountAmount: couponCode ? 50 : 0,
          shippingAmount: 99,
          taxAmount: 22.5,
          total: couponCode ? 521.5 : 621.5,
          couponCode,
        },
      };
    }

    function seedHappyPath(couponCode: string | null) {
      mockCart.getCart.mockResolvedValue(cartWithCoupon(couponCode));
      mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr_1' });
      mockPrisma.order.create.mockResolvedValue({
        ...baseOrder,
        user: { email: 'a@b.c', firstName: 'A' },
        items: [],
      });
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    }

    it('claims the coupon usage atomically with a limit predicate inside the checkout transaction', async () => {
      seedHappyPath('SAVE10');
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon_1',
        code: 'SAVE10',
        isActive: true,
        usageLimit: 10,
        usageCount: 9,
      });

      await service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any);

      // The claim re-checks the limit in the write predicate — the last use is
      // only granted when usageCount is still below the limit at write time.
      expect(mockPrisma.coupon.updateMany).toHaveBeenCalledWith({
        where: {
          code: 'SAVE10',
          isActive: true,
          usageCount: { lt: 10 },
        },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('rejects the checkout when the coupon is exhausted at claim time (concurrent last-use race loser)', async () => {
      seedHappyPath('SAVE10');
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon_1',
        code: 'SAVE10',
        isActive: true,
        usageLimit: 10,
        usageCount: 9,
      });
      // Another checkout claimed the final use between our read and write
      mockPrisma.coupon.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any),
      ).rejects.toThrow('Coupon usage limit reached');

      // The whole checkout transaction threw -> order creation rolled back with it
      expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('unlimited coupons (usageLimit null) carry no count predicate', async () => {
      seedHappyPath('UNLIMITED');
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon_2',
        code: 'UNLIMITED',
        isActive: true,
        usageLimit: null,
        usageCount: 999,
      });

      await service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any);

      expect(mockPrisma.coupon.updateMany).toHaveBeenCalledWith({
        where: { code: 'UNLIMITED', isActive: true },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('rejects an inactive coupon at claim time', async () => {
      seedHappyPath('DEAD');
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon_3',
        code: 'DEAD',
        isActive: false,
        usageLimit: 5,
        usageCount: 0,
      });

      await expect(
        service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any),
      ).rejects.toThrow('Invalid coupon');
      expect(mockPrisma.coupon.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('create - atomic conditional stock reservation', () => {
    function stockCartItem(overrides: any = {}) {
      return {
        id: 'ci_1',
        productId: 'prod_1',
        variantId: 'variant_1',
        quantity: 2,
        unitPrice: 500,
        lineTotal: 1000,
        product: { name: 'Tee', images: [] },
        variant: { stock: 5, size: 'M', color: null, sku: 'TEE-M', price: 500 },
        ...overrides,
      };
    }

    function seedCart(items: any[]) {
      mockCart.getCart.mockResolvedValue({
        id: 'cart_1',
        items,
        summary: {
          subtotal: 1000,
          discountAmount: 0,
          shippingAmount: 99,
          taxAmount: 50,
          total: 1149,
          couponCode: null,
        },
      });
      mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr_1' });
      mockPrisma.order.create.mockResolvedValue({
        ...baseOrder,
        user: { email: 'a@b.c', firstName: 'A' },
        items: [],
      });
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder });
    }

    it('decrements stock atomically with a sufficient-stock predicate inside the checkout transaction', async () => {
      seedCart([stockCartItem()]);

      await service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any);

      // Conditional, atomic decrement: the WHERE clause re-checks stock at
      // write time, so the update itself is the oversell guard.
      expect(mockPrisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 'variant_1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
    });

    it('rolls back the whole checkout when the stock predicate matches no row (concurrent oversell loser)', async () => {
      seedCart([stockCartItem()]);
      // Another checkout claimed the last units between our read and write
      mockPrisma.productVariant.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any),
      ).rejects.toThrow('Insufficient stock for Tee');

      // The transaction threw at the stock guard — no later checkout side
      // effects ran, and everything before it rolls back with the transaction.
      expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.cart.update).not.toHaveBeenCalled();
    });

    it('rejects at the pre-check when the cart snapshot already shows insufficient stock', async () => {
      seedCart([
        stockCartItem({ variant: { stock: 1, size: 'M', color: null, sku: 'TEE-M', price: 500 } }),
      ]);

      await expect(
        service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any),
      ).rejects.toThrow('Insufficient stock for Tee');

      expect(mockPrisma.productVariant.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it('variant-less items carry no stock guard and skip the decrement', async () => {
      seedCart([stockCartItem({ variantId: null, variant: null })]);

      await service.create('user_1', { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId: 'addr_1' } as any);

      expect(mockPrisma.productVariant.updateMany).not.toHaveBeenCalled();
      // The product sold counter still tracks the line
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod_1' },
        data: { totalSold: { increment: 2 } },
      });
    });
  });
});
