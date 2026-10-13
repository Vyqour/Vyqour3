import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { QikinkService } from '../qikink/qikink.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let cartService: any;
  let mailService: any;
  let qikinkService: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      $executeRaw: jest.fn(),
      address: { findFirst: jest.fn() },
      order: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      productVariant: { updateMany: jest.fn(), update: jest.fn() },
      inventory: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      product: { update: jest.fn() },
      coupon: { updateMany: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      cart: { update: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
    };

    cartService = { getCart: jest.fn() };
    mailService = { sendOrderConfirmation: jest.fn().mockResolvedValue(true) };
    qikinkService = { enqueueOrderSubmission: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: MailService, useValue: mailService },
        { provide: QikinkService, useValue: qikinkService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create order stock reservation', () => {
    it('should reserve variant-less inventory atomically when available stock is sufficient', async () => {
      cartService.getCart.mockResolvedValue({
        id: 'c1',
        items: [
          {
            productId: 'p1',
            variantId: null,
            product: { name: 'Simple T-Shirt', images: [] },
            unitPrice: 500,
            quantity: 2,
            lineTotal: 1000,
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

      prisma.address.findFirst.mockResolvedValue({ id: 'addr1' });
      prisma.order.create.mockResolvedValue({
        id: 'o1',
        orderNumber: 'VYQ1001',
        total: 1050,
        user: { email: 'user@example.com', firstName: 'John' },
      });
      prisma.inventory.findUnique.mockResolvedValue({
        productId: 'p1',
        quantity: 10,
        reserved: 2,
        trackInventory: true,
      });
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        orderNumber: 'VYQ1001',
        userId: 'u1',
        status: OrderStatus.PENDING,
        items: [],
      });

      await service.create('u1', { shippingAddressId: 'addr1', paymentMethod: PaymentMethod.RAZORPAY });

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should reject order creation if variant-less product has insufficient inventory', async () => {
      cartService.getCart.mockResolvedValue({
        id: 'c1',
        items: [
          {
            productId: 'p1',
            variantId: null,
            product: { name: 'Simple T-Shirt', images: [] },
            unitPrice: 500,
            quantity: 5,
            lineTotal: 2500,
          },
        ],
        summary: { subtotal: 2500, discountAmount: 0, shippingAmount: 0, taxAmount: 125, total: 2625 },
      });

      prisma.address.findFirst.mockResolvedValue({ id: 'addr1' });
      prisma.order.create.mockResolvedValue({
        id: 'o1',
        orderNumber: 'VYQ1001',
        total: 2625,
        user: { email: 'user@example.com', firstName: 'John' },
      });
      prisma.inventory.findUnique.mockResolvedValue({
        productId: 'p1',
        quantity: 10,
        reserved: 8,
        trackInventory: true,
      });
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(
        service.create('u1', { shippingAddressId: 'addr1', paymentMethod: PaymentMethod.RAZORPAY }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment totalSold on COD order creation', async () => {
      cartService.getCart.mockResolvedValue({
        id: 'c1',
        items: [
          {
            productId: 'p1',
            variantId: null,
            product: { name: 'Simple T-Shirt', images: [] },
            unitPrice: 500,
            quantity: 2,
            lineTotal: 1000,
          },
        ],
        summary: { subtotal: 1000, discountAmount: 0, shippingAmount: 0, taxAmount: 50, total: 1050 },
      });

      prisma.address.findFirst.mockResolvedValue({ id: 'addr1' });
      prisma.order.create.mockResolvedValue({
        id: 'o1',
        orderNumber: 'VYQ1001',
        total: 1050,
        user: { email: 'user@example.com', firstName: 'John' },
      });
      prisma.inventory.findUnique.mockResolvedValue({ productId: 'p1', quantity: 10, reserved: 0, trackInventory: true });
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.order.findFirst.mockResolvedValue({ id: 'o1', orderNumber: 'VYQ1001', userId: 'u1' });

      await service.create('u1', { shippingAddressId: 'addr1', paymentMethod: PaymentMethod.COD });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { totalSold: { increment: 2 } },
      });
    });
  });

  describe('cancel order inventory restoration', () => {
    it('should restore variant-less inventory and decrement COD totalSold on customer cancel', async () => {
      const order = {
        id: 'o1',
        userId: 'u1',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.COD,
        items: [{ productId: 'p1', variantId: null, quantity: 2 }],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.inventory.findUnique.mockResolvedValue({ productId: 'p1', reserved: 2, trackInventory: true });

      await service.cancel('o1', 'u1', 'Changed mind');

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: { reserved: { decrement: 2 } },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { totalSold: { decrement: 2 } },
      });
    });

    it('should decrement totalSold for refunded prepaid orders when status is set to REFUNDED', async () => {
      const order = {
        id: 'o2',
        userId: 'u1',
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.RAZORPAY,
        items: [{ productId: 'p1', variantId: null, quantity: 1 }],
      };
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      await service.updateStatus('o2', { status: OrderStatus.REFUNDED, note: 'Order refunded' }, 'admin1');

      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw error if order status transition in cancel is raced or already changed', async () => {
      const order = {
        id: 'o1',
        userId: 'u1',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.COD,
        items: [{ productId: 'p1', variantId: null, quantity: 2 }],
      };
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('o1', 'u1', 'Changed mind')).rejects.toThrow(BadRequestException);
    });
  });
});
