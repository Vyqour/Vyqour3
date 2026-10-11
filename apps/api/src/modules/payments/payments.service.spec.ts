import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { PaymentsService } from './payments.service';

describe('PaymentsService - Production Safety Audit', () => {
  let service: PaymentsService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockQikink: any;

  const keySecret = 'rzp_secret_key_123';
  const webhookSecret = 'wh_secret_key_456';

  const mockOrder = {
    id: 'order_123',
    orderNumber: 'VYQ10001',
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.RAZORPAY,
    total: 1000 as any,
    paymentGatewayRef: 'order_rzp_123',
    payments: [
      {
        id: 'pay_1',
        orderId: 'order_123',
        gatewayOrderId: 'order_rzp_123',
        status: PaymentStatus.PENDING,
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
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
        if (key === 'razorpay.keyId') return 'rzp_test_123';
        if (key === 'razorpay.keySecret') return keySecret;
        if (key === 'razorpay.webhookSecret') return webhookSecret;
        if (key === 'NODE_ENV') return 'test';
        return null;
      }),
    };

    mockQikink = {
      enqueueOrderSubmission: jest.fn().mockResolvedValue({ queued: true }),
    };

    service = new PaymentsService(mockPrisma, mockConfig, mockQikink);
  });

  describe('verifyPayment', () => {
    beforeEach(() => {
      // Mock global fetch for Razorpay API endpoint
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'pay_rzp_456',
          order_id: 'order_rzp_123',
          amount: 100000, // 1000 INR = 100000 paise
          currency: 'INR',
          status: 'captured',
        }),
      } as any);
    });

    it('1. valid payment amount + currency -> accepted & order marked CONFIRMED/PAID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      const res = await service.verifyPayment({
        orderId: 'order_123',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      expect(res.message).toBe('Payment verified');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockQikink.enqueueOrderSubmission).toHaveBeenCalledWith(
        'order_123',
        'payment_verified',
      );
    });

    it('1b. Razorpay API returns non-2xx -> payment rejected, markOrderPaid NOT called, Qikink NOT enqueued', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found'),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow('Failed to verify payment details with Razorpay API (status 404)');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('1d. Razorpay returns a different payment ID -> payment rejected, markOrderPaid NOT called, Qikink NOT enqueued', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'pay_rzp_DIFFERENT',
          order_id: 'order_rzp_123',
          amount: 100000,
          currency: 'INR',
          status: 'captured',
        }),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow('Razorpay payment ID mismatch: expected pay_rzp_456, received pay_rzp_DIFFERENT');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('1e. Razorpay returns a response missing payment ID, order ID, amount, currency, or status -> rejected', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      // Missing id
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          order_id: 'order_rzp_123',
          amount: 100000,
          currency: 'INR',
          status: 'captured',
        }),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow('Razorpay payment ID mismatch');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('1c. Razorpay API request throws/network failure -> payment rejected, markOrderPaid NOT called, Qikink NOT enqueued', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow('Failed to verify payment details with Razorpay API: Network error');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('2. wrong payment amount -> rejected with BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'pay_rzp_456',
          order_id: 'order_rzp_123',
          amount: 50000, // Mismatched amount (500 INR instead of 1000 INR)
          currency: 'INR',
        }),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('3. wrong currency -> rejected with BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'pay_rzp_456',
          order_id: 'order_rzp_123',
          amount: 100000,
          currency: 'USD', // Mismatched currency
        }),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. payment ID belonging to another Razorpay order -> rejected', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'pay_rzp_456',
          order_id: 'order_rzp_OTHER', // Belongs to different Razorpay order
          amount: 100000,
          currency: 'INR',
        }),
      } as any);

      const razorpayOrderId = 'order_rzp_123';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. missing/mismatched stored Razorpay order ID -> rejected', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentGatewayRef: null,
        payments: [],
      });

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: 'sig',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. repeated successful verification -> idempotent return', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentStatus: PaymentStatus.PAID,
      });

      const res = await service.verifyPayment({
        orderId: 'order_123',
        razorpayOrderId: 'order_rzp_123',
        razorpayPaymentId: 'pay_rzp_456',
        razorpaySignature: 'sig',
      });

      expect(res.duplicate).toBe(true);
      expect(res.message).toBe('Payment already verified');
      expect(mockQikink.enqueueOrderSubmission).toHaveBeenCalledWith(
        'order_123',
        'already_paid_verify',
      );
    });

    it('7. invalid signature -> rejected', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: 'invalid_sig',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('configuration & webhook secret', () => {
    it('does not fall back to RAZORPAY_KEY_SECRET for webhookSecret', () => {
      const config = {
        get: jest.fn((key: string) => {
          if (key === 'razorpay.keySecret') return 'key_secret_123';
          if (key === 'razorpay.webhookSecret') return undefined; // No webhook secret configured
          return null;
        }),
      };
      const payments = new PaymentsService(mockPrisma, config as any, mockQikink);
      expect((payments as any).webhookSecret).toBeUndefined();
    });
  });

  describe('handleRazorpayWebhook', () => {
    it('8. valid signed webhook -> accepted and enqueues Qikink', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const payloadBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_999',
              order_id: 'order_rzp_123',
              amount: 100000,
              currency: 'INR',
              status: 'captured',
              notes: { orderId: 'order_123' },
            },
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(payloadBody));
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const res = await service.handleRazorpayWebhook(
        signature,
        rawBody,
        payloadBody,
      );

      expect(res.matched).toBe(true);
      expect(mockQikink.enqueueOrderSubmission).toHaveBeenCalledWith(
        'order_123',
        'razorpay_webhook:payment.captured',
      );
    });

    it('9. webhook amount mismatch -> rejected', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const payloadBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_999',
              order_id: 'order_rzp_123',
              amount: 50000, // Mismatched amount
              currency: 'INR',
              status: 'captured',
              notes: { orderId: 'order_123' },
            },
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(payloadBody));
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      await expect(
        service.handleRazorpayWebhook(signature, rawBody, payloadBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('10. webhook currency mismatch -> rejected', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const payloadBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_999',
              order_id: 'order_rzp_123',
              amount: 100000,
              currency: 'USD', // Mismatched currency
              status: 'captured',
              notes: { orderId: 'order_123' },
            },
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(payloadBody));
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      await expect(
        service.handleRazorpayWebhook(signature, rawBody, payloadBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('11. production without dedicated RAZORPAY_WEBHOOK_SECRET -> rejected', async () => {
      const prodConfig = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'razorpay.keyId') return 'rzp_live_123';
          if (key === 'razorpay.keySecret') return 'key_secret_123';
          if (key === 'razorpay.webhookSecret') return null; // Missing dedicated webhook secret
          return null;
        }),
      };
      const prodService = new PaymentsService(mockPrisma, prodConfig as any, mockQikink);

      const payloadBody = { event: 'payment.captured' };
      const rawBody = Buffer.from(JSON.stringify(payloadBody));

      await expect(
        prodService.handleRazorpayWebhook('sig', rawBody, payloadBody),
      ).rejects.toThrow('RAZORPAY_WEBHOOK_SECRET is required in production');
    });
  });
});
