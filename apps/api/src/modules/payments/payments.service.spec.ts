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
    it('1. valid Razorpay signature -> payment accepted & order marked CONFIRMED/PAID, Qikink enqueued', async () => {
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

    it('2. invalid signature -> rejected with BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_456',
          razorpaySignature: 'invalid_sig',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('3. wrong Razorpay order ID -> rejected with BadRequestException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const wrongOrderId = 'order_rzp_WRONG';
      const razorpayPaymentId = 'pay_rzp_456';
      const body = `${wrongOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      await expect(
        service.verifyPayment({
          orderId: 'order_123',
          razorpayOrderId: wrongOrderId,
          razorpayPaymentId,
          razorpaySignature,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQikink.enqueueOrderSubmission).not.toHaveBeenCalled();
    });

    it('4. duplicate verification/callback -> idempotent return', async () => {
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

    it('5. cancelled/refunded order -> cannot transition to PAID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
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
  });

  describe('handleRazorpayWebhook', () => {
    it('6. valid webhook event -> updates payment and enqueues Qikink', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const payloadBody = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_999',
              order_id: 'order_rzp_123',
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

    it('7. webhook with invalid signature -> throws BadRequestException', async () => {
      const payloadBody = { event: 'payment.captured' };
      const rawBody = Buffer.from(JSON.stringify(payloadBody));

      await expect(
        service.handleRazorpayWebhook('invalid_wh_sig', rawBody, payloadBody),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
