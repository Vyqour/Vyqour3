import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  PaymentStatus,
  QikinkJobStatus,
  QikinkJobType,
  QikinkSyncStatus,
} from '@prisma/client';
import { QikinkService } from './qikink.service';

describe('QikinkService - Order Submission Hardening', () => {
  let service: QikinkService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockClient: any;
  let mockQueue: any;
  let mockMail: any;

  const mockAddress = {
    id: 'addr_1',
    fullName: 'John Doe',
    phone: '9876543210',
    line1: '123 Main St',
    line2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  };

  const mockUser = {
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '9876543210',
  };

  const baseOrder = {
    id: 'order_1',
    orderNumber: 'VYQ10001',
    status: 'CONFIRMED' as const,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.RAZORPAY,
    total: 1000 as any,
    qikinkOrderId: null,
    qikinkSyncStatus: QikinkSyncStatus.QUEUED,
    qikinkIdempotencyKey: 'idem_key_123',
    qikinkOrderNumber: 'VYQ10001',
    shippingAddress: mockAddress,
    user: mockUser,
    items: [
      {
        id: 'item_1',
        productName: 'T-Shirt',
        unitPrice: 1000 as any,
        quantity: 1,
        sku: 'TS-M',
        product: {
          id: 'p1',
          name: 'T-Shirt',
          slug: 't-shirt',
          qikinkSku: 'QIK-TS',
          qikinkSearchFromMyProducts: 1,
          category: { slug: 't-shirts', name: 'T-Shirts' },
        },
        variant: null,
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((promises) =>
        Array.isArray(promises) ? Promise.all(promises) : promises(mockPrisma),
      ),
    };

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'qikink.shipping') return '1';
        if (key === 'qikink.autoSubmit') return true;
        return null;
      }),
    };

    mockClient = {
      isEnabled: jest.fn().mockReturnValue(true),
      createOrder: jest.fn(),
    };

    mockQueue = {
      enqueue: jest.fn(),
    };

    mockMail = {
      sendShippingNotification: jest.fn(),
    };

    service = new QikinkService(
      mockPrisma,
      mockConfig,
      mockClient,
      mockQueue,
      mockMail,
    );
  });

  it('1. Successful first submission maps payload and updates order to SUBMITTED', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockClient.createOrder.mockResolvedValue({
      order_id: 'QIK12345',
      message: 'Success',
    });

    const result = await service.processSubmitJob('order_1');

    expect(result).toEqual({
      success: true,
      qikinkOrderId: 'QIK12345',
      response: { order_id: 'QIK12345', message: 'Success' },
    });
    expect(mockClient.createOrder).toHaveBeenCalledTimes(1);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1' },
        data: expect.objectContaining({
          qikinkOrderId: 'QIK12345',
          qikinkSyncStatus: QikinkSyncStatus.SUBMITTED,
        }),
      }),
    );
  });

  it('2. Duplicate submission prevention - skips if qikinkOrderId or SUBMITTED status exists', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      qikinkOrderId: 'QIK12345',
      qikinkSyncStatus: QikinkSyncStatus.SUBMITTED,
    });

    const result = await service.processSubmitJob('order_1');

    expect(result).toEqual({
      skipped: true,
      qikinkOrderId: 'QIK12345',
      reason: 'already_submitted',
    });
    expect(mockClient.createOrder).not.toHaveBeenCalled();
  });

  it('3. Concurrent submission protection - skips if atomic claim fails', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 }); // Claim failed

    const result = await service.processSubmitJob('order_1');

    expect(result).toEqual({
      skipped: true,
      reason: 'concurrent_submission_in_progress',
    });
    expect(mockClient.createOrder).not.toHaveBeenCalled();
  });

  it('4. Transient API failure -> keeps qikinkSyncStatus QUEUED for retries', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockClient.createOrder.mockRejectedValue(new Error('Network timeout'));

    await expect(service.processSubmitJob('order_1')).rejects.toThrow('Network timeout');

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1' },
        data: expect.objectContaining({
          qikinkSyncStatus: QikinkSyncStatus.QUEUED,
          qikinkLastError: 'Network timeout',
        }),
      }),
    );
  });

  it('5. Permanent validation failure -> sets qikinkSyncStatus FAILED and marks error permanent', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      items: [
        {
          ...baseOrder.items[0],
          product: {
            ...baseOrder.items[0].product,
            qikinkSku: null, // missing SKU
          },
        },
      ],
    });

    try {
      await service.processSubmitJob('order_1');
      fail('Should have thrown error');
    } catch (err: any) {
      expect(err.isPermanent).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            qikinkSyncStatus: QikinkSyncStatus.FAILED,
          }),
        }),
      );
    }
  });

  it('6. Unpaid prepaid order -> returns awaiting_payment and sets qikinkSyncStatus PENDING', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      paymentMethod: PaymentMethod.RAZORPAY,
      paymentStatus: PaymentStatus.PENDING,
    });

    const res = await service.processSubmitJob('order_1');

    expect(res).toEqual({ skipped: true, reason: 'awaiting_payment' });
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1' },
        data: expect.objectContaining({
          qikinkSyncStatus: QikinkSyncStatus.PENDING,
          qikinkLastError: 'Waiting for prepaid payment verification',
        }),
      }),
    );
  });

  it('7. COD submission - allows COD orders to submit without prepaid check', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
    });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockClient.createOrder.mockResolvedValue({ order_id: 'QIK_COD_123' });

    const result = await service.processSubmitJob('order_1');

    expect(result.success).toBe(true);
    expect(result.qikinkOrderId).toBe('QIK_COD_123');
  });

  it('8. Idempotency key generation and reuse on enqueue', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      qikinkIdempotencyKey: 'existing_key_999',
    });
    mockPrisma.order.update.mockResolvedValue({});
    mockQueue.enqueue.mockResolvedValue({ id: 'job_123' });

    const res = await service.enqueueOrderSubmission('order_1', 'auto');

    expect(res.queued).toBe(true);
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qikinkIdempotencyKey: 'existing_key_999',
        }),
      }),
    );
  });
});
