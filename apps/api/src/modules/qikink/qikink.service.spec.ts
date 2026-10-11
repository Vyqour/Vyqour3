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
        findFirst: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      qikinkApiLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      qikinkWebhookEvent: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
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
      getOrderStatus: jest.fn(),
    };

    mockQueue = {
      enqueue: jest.fn(),
    };

    mockMail = {
      sendShippingNotification: jest.fn().mockResolvedValue({}),
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

  it('9. Concurrent enqueue race test - verifies queue returns same active SUBMIT_ORDER job under concurrent calls', async () => {
    const { QikinkJobQueue } = jest.requireActual('./queue/qikink-job.queue');

    let activeJobInDb: any = null;

    const mockTxPrisma = {
      $executeRaw: jest.fn().mockImplementation(async () => {
        // Simulates DB row-level lock delay
        await new Promise((resolve) => setTimeout(resolve, 20));
        return 1;
      }),
      qikinkJob: {
        findFirst: jest.fn().mockImplementation(async () => {
          return activeJobInDb;
        }),
        create: jest.fn().mockImplementation(async () => {
          activeJobInDb = { id: 'job_active_123', type: QikinkJobType.SUBMIT_ORDER, orderId: 'order_1', status: QikinkJobStatus.PENDING };
          return activeJobInDb;
        }),
      },
    };

    const txPrismaService = {
      $transaction: jest.fn(async (cb: any) => cb(mockTxPrisma)),
    };

    const realQueue = new QikinkJobQueue(txPrismaService as any, mockConfig);

    const [j1, j2] = await Promise.all([
      realQueue.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: 'order_1' }),
      realQueue.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: 'order_1' }),
    ]);

    expect(j1.id).toBe('job_active_123');
    expect(j2.id).toBe('job_active_123');
    expect(mockTxPrisma.qikinkJob.create).toHaveBeenCalledTimes(1);
    expect(mockTxPrisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('10. Max-attempt limit test - queue fail marks job DEAD when attempts >= maxAttempts', async () => {
    const { QikinkJobQueue } = jest.requireActual('./queue/qikink-job.queue');
    const queue = new QikinkJobQueue(mockPrisma, mockConfig);
    mockPrisma.qikinkJob = { update: jest.fn().mockResolvedValue({ status: QikinkJobStatus.DEAD }) };

    await queue.fail('job_1', 'Transient error', 8, 8, false);

    expect(mockPrisma.qikinkJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job_1' },
        data: expect.objectContaining({
          status: QikinkJobStatus.DEAD,
          error: 'Transient error',
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

  it('3b. Concurrent race test - two simultaneous processSubmitJob calls result in only one Qikink createOrder call', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
    // First call updateMany returns count: 1 (claimed), second call returns count: 0
    mockPrisma.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    mockClient.createOrder.mockResolvedValue({ order_id: 'QIK_RACE_123' });

    const [res1, res2] = await Promise.all([
      service.processSubmitJob('order_1'),
      service.processSubmitJob('order_1'),
    ]);

    // One succeeds, the other is skipped due to concurrent processing
    const results = [res1, res2];
    const successResult = results.find((r) => r.success);
    const skippedResult = results.find((r) => r.skipped);

    expect(successResult).toBeDefined();
    expect(successResult?.qikinkOrderId).toBe('QIK_RACE_123');
    expect(skippedResult).toBeDefined();
    expect(skippedResult?.reason).toBe('concurrent_submission_in_progress');
    expect(mockClient.createOrder).toHaveBeenCalledTimes(1);
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

  describe('Phase 8: Order Status Polling & Webhook Handling', () => {
    beforeEach(() => {
      mockPrisma.qikinkWebhookEvent = {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      };
      mockPrisma.order.findFirst = jest.fn();
    });

    it('P8-1. Valid status response and supported status mapping -> updates order status and tracking info', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'PROCESSING',
        qikinkOrderId: 'QIK_POLL_1',
      });
      mockClient.getOrderStatus = jest.fn().mockResolvedValue({
        order_id: 'QIK_POLL_1',
        status: 'shipped',
        awb: 'AWB987654',
        courier: 'BlueDart',
      });

      const res = await service.processStatusSync('order_1');

      expect(res).toEqual({ orderId: 'order_1', mapped: 'SHIPPED', status: 'shipped' });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1' },
          data: expect.objectContaining({
            status: 'SHIPPED',
            qikinkAwb: 'AWB987654',
            trackingNumber: 'AWB987654',
            qikinkCourier: 'BlueDart',
            carrier: 'BlueDart',
          }),
        }),
      );
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-2. Unknown status and malformed response -> safe handling without changing internal status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'PROCESSING',
        qikinkOrderId: 'QIK_POLL_2',
      });
      mockClient.getOrderStatus = jest.fn().mockResolvedValue({
        order_id: 'QIK_POLL_2',
        status: 'some_unknown_vendor_status_xyz',
      });

      const res = await service.processStatusSync('order_1');

      expect(res).toEqual({ orderId: 'order_1', mapped: null, status: 'some_unknown_vendor_status_xyz' });
      // Order status should not change
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1' },
          data: expect.objectContaining({
            qikinkStatus: 'some_unknown_vendor_status_xyz',
          }),
        }),
      );
      expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: expect.anything(),
          }),
        }),
      );
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-3. Duplicate status update -> idempotent handling with no duplicate order status history or submission', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'SHIPPED',
        qikinkStatus: 'shipped',
        qikinkAwb: 'AWB987654',
      });

      const res = await service.applyFulfillmentUpdate('order_1', {
        status: 'shipped',
        awb: 'AWB987654',
        source: 'poll',
      });

      expect(res).toEqual({ orderId: 'order_1', mapped: 'SHIPPED', status: 'shipped' });
      // Since mapped === order.status, statusHistory is NOT created
      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-4. Older status response attempting to overwrite a newer state -> state regression prevented', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'SHIPPED',
        qikinkOrderId: 'QIK_123',
      });

      const res = await service.applyFulfillmentUpdate('order_1', {
        status: 'processing', // Lower rank than SHIPPED
        source: 'poll',
      });

      expect(res).toEqual({ orderId: 'order_1', mapped: 'PROCESSING', status: 'processing' });
      // data.status should NOT be in update since rank(PROCESSING) < rank(SHIPPED)
      const updateData = mockPrisma.order.update.mock.calls[0][0].data;
      expect(updateData.status).toBeUndefined();
      expect(mockPrisma.orderStatusHistory.create).not.toHaveBeenCalled();
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-5. Webhook invalid authentication / missing signature -> throws BadRequestException', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'qikink.webhookSecret') return 'super_secret_webhook_key';
        return null;
      });

      await expect(
        service.handleWebhook({}, Buffer.from('{}'), {}),
      ).rejects.toThrow(BadRequestException);

      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-6. Malformed webhook payload missing order identifier -> safely handled without crashing', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'qikink.webhookSecret') return ''; // dev mode
        return null;
      });
      mockPrisma.qikinkWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.qikinkWebhookEvent.upsert.mockResolvedValue({ id: 'evt_1' });
      mockPrisma.qikinkWebhookEvent.update.mockResolvedValue({});
      mockPrisma.qikinkApiLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await service.handleWebhook({}, Buffer.from('{}'), {});

      expect(res).toEqual({ ok: true, matched: false });
      expect(mockPrisma.qikinkWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt_1' },
          data: expect.objectContaining({ error: 'Order not found' }),
        }),
      );
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-7. Duplicate webhook event -> returns ok: true, duplicate: true', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'qikink.webhookSecret') return '';
        return null;
      });
      mockPrisma.qikinkWebhookEvent.findUnique.mockResolvedValue({
        id: 'evt_dup',
        processed: true,
      });

      const res = await service.handleWebhook({}, Buffer.from('{"id":"evt_dup"}'), { id: 'evt_dup' });

      expect(res).toEqual({ ok: true, duplicate: true });
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-8. Unknown order ID in webhook -> logs event with error and returns matched: false', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'qikink.webhookSecret') return '';
        return null;
      });
      mockPrisma.qikinkWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.qikinkWebhookEvent.upsert.mockResolvedValue({ id: 'evt_unknown' });
      mockPrisma.qikinkWebhookEvent.update.mockResolvedValue({});
      mockPrisma.qikinkApiLog.create = jest.fn().mockResolvedValue({});
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await service.handleWebhook(
        {},
        Buffer.from('{"order_id":"UNKNOWN_QIK_999"}'),
        { order_id: 'UNKNOWN_QIK_999' },
      );

      expect(res).toEqual({ ok: true, matched: false });
      expect(mockPrisma.qikinkWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ error: 'Order not found' }),
        }),
      );
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-9. Webhook attempting to overwrite a terminal order state (DELIVERED) -> prevented', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'qikink.webhookSecret') return '';
        return null;
      });
      mockPrisma.qikinkWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.qikinkWebhookEvent.upsert.mockResolvedValue({ id: 'evt_term' });
      mockPrisma.qikinkWebhookEvent.update.mockResolvedValue({});
      mockPrisma.qikinkApiLog.create = jest.fn().mockResolvedValue({});

      mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'DELIVERED',
        qikinkOrderId: 'QIK_TERM_1',
      });
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        status: 'DELIVERED',
        qikinkOrderId: 'QIK_TERM_1',
      });

      const res = await service.handleWebhook(
        {},
        Buffer.from('{"order_id":"QIK_TERM_1","status":"cancelled"}'),
        { order_id: 'QIK_TERM_1', status: 'cancelled' },
      );

      expect(res).toEqual({ ok: true, matched: true, orderId: 'order_1' });
      const updateData = mockPrisma.order.update.mock.calls[0][0].data;
      expect(updateData.status).toBeUndefined(); // Status unchanged
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });

    it('P8-10. Status polling with missing qikinkOrderId -> skips polling cleanly', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...baseOrder,
        id: 'order_1',
        qikinkOrderId: null,
      });

      const res = await service.processStatusSync('order_1');

      expect(res).toEqual({ skipped: true, reason: 'missing_qikink_order_id' });
      expect(mockClient.getOrderStatus).not.toHaveBeenCalled();
      expect(mockClient.createOrder).not.toHaveBeenCalled();
    });
  });
});
