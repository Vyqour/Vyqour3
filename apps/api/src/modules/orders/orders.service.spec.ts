import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService - Inventory & Stock Reservation', () => {
  let service: OrdersService;
  let mockPrisma: any;
  let mockCart: any;
  let mockMail: any;
  let mockQikink: any;

  const mockUser = { id: 'u1', email: 'user@example.com', firstName: 'John' };
  const mockAddress = { id: 'addr1', userId: 'u1', fullName: 'John Doe' };

  beforeEach(() => {
    mockPrisma = {
      address: { findFirst: jest.fn().mockResolvedValue(mockAddress) },
      order: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      productVariant: {
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
      coupon: {
        updateMany: jest.fn(),
      },
      cartItem: { deleteMany: jest.fn() },
      cart: { update: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    mockCart = {
      getCart: jest.fn(),
    };

    mockMail = {
      sendOrderConfirmation: jest.fn().mockResolvedValue({}),
    };

    mockQikink = {
      enqueueOrderSubmission: jest.fn().mockResolvedValue({}),
    };

    service = new OrdersService(mockPrisma, mockCart, mockMail, mockQikink);
  });

  it('1. Reserves stock for variant-less product using Inventory model during order creation', async () => {
    mockCart.getCart.mockResolvedValue({
      id: 'cart1',
      items: [
        {
          id: 'ci1',
          productId: 'p1_no_variant',
          variantId: null,
          quantity: 2,
          unitPrice: 500,
          lineTotal: 1000,
          product: { name: 'Simple Poster', images: [{ url: 'http://img.jpg' }] },
          variant: null,
        },
      ],
      summary: {
        subtotal: 1000,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 50,
        total: 1050,
        couponCode: null,
      },
    });

    const createdOrder = {
      id: 'ord1',
      orderNumber: 'VYQ10001',
      userId: 'u1',
      status: 'CONFIRMED',
      total: 1050,
      user: mockUser,
      items: [{ productId: 'p1_no_variant', variantId: null, quantity: 2 }],
    };

    mockPrisma.order.create.mockResolvedValue(createdOrder);
    mockPrisma.order.findFirst.mockResolvedValue(createdOrder);

    mockPrisma.inventory.findUnique.mockResolvedValue({
      productId: 'p1_no_variant',
      quantity: 10,
      trackInventory: true,
    });

    mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 });

    await service.create('u1', {
      shippingAddressId: 'addr1',
      paymentMethod: PaymentMethod.COD,
    });

    expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
      where: { productId: 'p1_no_variant', trackInventory: true, quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
  });

  it('2. Fails order creation when variant-less product inventory is insufficient', async () => {
    mockCart.getCart.mockResolvedValue({
      id: 'cart1',
      items: [
        {
          id: 'ci1',
          productId: 'p1_no_variant',
          variantId: null,
          quantity: 5,
          unitPrice: 500,
          lineTotal: 2500,
          product: { name: 'Limited Poster', images: [] },
          variant: null,
        },
      ],
      summary: { total: 2500 },
    });

    mockPrisma.order.create.mockResolvedValue({
      id: 'ord2',
      orderNumber: 'VYQ10002',
      total: 2500,
      user: mockUser,
    });

    mockPrisma.inventory.findUnique.mockResolvedValue({
      productId: 'p1_no_variant',
      quantity: 2, // Only 2 left, requested 5
      trackInventory: true,
    });

    mockPrisma.inventory.updateMany.mockResolvedValue({ count: 0 }); // Lock failed

    await expect(
      service.create('u1', { shippingAddressId: 'addr1', paymentMethod: PaymentMethod.COD }),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. Restocks variant-less product inventory upon order cancellation', async () => {
    const mockOrder = {
      id: 'ord1',
      orderNumber: 'VYQ10001',
      userId: 'u1',
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.COD,
      items: [{ id: 'i1', productId: 'p1_no_variant', variantId: null, quantity: 2 }],
      user: mockUser,
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 }); // Cancellation claimed

    await service.cancel('ord1', 'u1', 'Changed mind');

    expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
      where: { productId: 'p1_no_variant', trackInventory: true },
      data: { quantity: { increment: 2 } },
    });
  });
});
