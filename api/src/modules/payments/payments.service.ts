import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QikinkService } from '../qikink/qikink.service';

/**
 * Razorpay-ready payment service with webhook verification + Qikink handoff.
 * When keys are missing, online payments return a mock order for local testing.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private keyId?: string;
  private keySecret?: string;
  private webhookSecret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => QikinkService))
    private readonly qikink: QikinkService,
  ) {
    this.keyId = this.config.get<string>('razorpay.keyId') || undefined;
    this.keySecret = this.config.get<string>('razorpay.keySecret') || undefined;
    this.webhookSecret =
      this.config.get<string>('razorpay.webhookSecret') || this.keySecret || undefined;
  }

  async createPaymentOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    if (order.paymentMethod === 'COD') {
      return { message: 'COD order — no online payment required', orderId: order.id };
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { message: 'Already paid', orderId: order.id, orderNumber: order.orderNumber };
    }

    const amountPaise = Math.round(Number(order.total) * 100);
    const payment = order.payments[0];

    if (!this.keyId || !this.keySecret) {
      this.logger.warn('Razorpay keys missing — returning mock payment order');
      const mockId = `order_mock_${order.orderNumber}`;
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { gatewayOrderId: mockId, gateway: 'razorpay-mock' },
        });
      }
      return {
        razorpayOrderId: mockId,
        amount: amountPaise,
        currency: 'INR',
        keyId: 'rzp_test_mock',
        orderId: order.id,
        orderNumber: order.orderNumber,
        mock: true,
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: order.orderNumber.slice(0, 40),
        notes: { orderId: order.id, orderNumber: order.orderNumber },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`Payment gateway error: ${text}`);
    }
    const rzp = (await res.json()) as { id: string; amount: number; currency: string };
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayOrderId: rzp.id, gateway: 'razorpay' },
      });
    }
    return {
      razorpayOrderId: rzp.id,
      amount: rzp.amount,
      currency: rzp.currency,
      keyId: this.keyId,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Client-side checkout verification (handler callback).
   * Idempotent — safe if webhook already marked PAID.
   */
  async verifyPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { payments: true },
    });
    if (!order) throw new BadRequestException('Order not found');

    if (order.paymentStatus === PaymentStatus.PAID) {
      await this.qikink.enqueueOrderSubmission(order.id, 'already_paid_verify').catch(() => undefined);
      return {
        message: 'Payment already verified',
        orderId: order.id,
        orderNumber: order.orderNumber,
        duplicate: true,
      };
    }

    if (this.keySecret) {
      const body = `${payload.razorpayOrderId}|${payload.razorpayPaymentId}`;
      const expected = createHmac('sha256', this.keySecret).update(body).digest('hex');
      if (expected !== payload.razorpaySignature) {
        throw new BadRequestException('Invalid payment signature');
      }
    } else if (!payload.razorpayOrderId.startsWith('order_mock_')) {
      throw new BadRequestException('Cannot verify payment without gateway secrets');
    }

    await this.markOrderPaid(order.id, {
      paymentId: payload.razorpayPaymentId,
      gatewayOrderId: payload.razorpayOrderId,
      gatewaySignature: payload.razorpaySignature,
      source: 'client_verify',
    });

    await this.qikink.enqueueOrderSubmission(order.id, 'payment_verified');

    return { message: 'Payment verified', orderId: order.id, orderNumber: order.orderNumber };
  }

  /**
   * Razorpay webhook (payment.captured / order.paid).
   * Prefer this path in production for automation reliability.
   */
  async handleRazorpayWebhook(
    signature: string | undefined,
    rawBody: Buffer | string | undefined,
    body: Record<string, unknown>,
  ) {
    if (this.webhookSecret) {
      if (!signature || !rawBody) {
        throw new BadRequestException('Missing Razorpay signature');
      }
      const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expected = createHmac('sha256', this.webhookSecret).update(raw).digest('hex');
      try {
        const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        if (!ok) throw new Error('mismatch');
      } catch {
        throw new BadRequestException('Invalid Razorpay webhook signature');
      }
    } else {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — accepting webhook without verify (dev only)');
    }

    const event = String(body.event || '');
    const payload = (body.payload || {}) as Record<string, unknown>;
    const paymentEntity = (payload.payment as { entity?: Record<string, unknown> } | undefined)
      ?.entity;
    const orderEntity = (payload.order as { entity?: Record<string, unknown> } | undefined)?.entity;

    const gatewayPaymentId = paymentEntity?.id ? String(paymentEntity.id) : undefined;
    const gatewayOrderId = paymentEntity?.order_id
      ? String(paymentEntity.order_id)
      : orderEntity?.id
        ? String(orderEntity.id)
        : undefined;
    const notes = (paymentEntity?.notes || orderEntity?.notes || {}) as Record<string, unknown>;
    const orderIdFromNotes = notes.orderId ? String(notes.orderId) : undefined;
    const receipt = orderEntity?.receipt ? String(orderEntity.receipt) : undefined;

    // Idempotency via gateway payment id
    if (gatewayPaymentId) {
      const existing = await this.prisma.payment.findFirst({
        where: { gatewayPaymentId },
      });
      if (existing?.status === PaymentStatus.PAID) {
        await this.qikink
          .enqueueOrderSubmission(existing.orderId, 'webhook_duplicate')
          .catch(() => undefined);
        return { ok: true, duplicate: true };
      }
    }

    let order =
      (orderIdFromNotes &&
        (await this.prisma.order.findUnique({ where: { id: orderIdFromNotes } }))) ||
      (gatewayOrderId &&
        (await this.prisma.order.findFirst({
          where: { paymentGatewayRef: gatewayOrderId },
        }))) ||
      (gatewayOrderId &&
        (await this.prisma.payment
          .findFirst({ where: { gatewayOrderId }, include: { order: true } })
          .then((p) => p?.order || null))) ||
      (receipt &&
        (await this.prisma.order.findFirst({
          where: { OR: [{ orderNumber: receipt }, { orderNumber: { contains: receipt } }] },
        }))) ||
      null;

    if (!order) {
      this.logger.warn(`Razorpay webhook order not found event=${event}`);
      return { ok: true, matched: false };
    }

    const successEvents = [
      'payment.captured',
      'payment.authorized',
      'order.paid',
      'payment.order.paid',
    ];
    if (!successEvents.includes(event) && paymentEntity?.status !== 'captured') {
      return { ok: true, ignored: true, event };
    }

    if (order.paymentStatus !== PaymentStatus.PAID) {
      await this.markOrderPaid(order.id, {
        paymentId: gatewayPaymentId,
        gatewayOrderId,
        source: `webhook:${event}`,
      });
    }

    await this.qikink.enqueueOrderSubmission(order.id, `razorpay_webhook:${event}`);
    return { ok: true, matched: true, orderId: order.id };
  }

  private async markOrderPaid(
    orderId: string,
    meta: {
      paymentId?: string;
      gatewayOrderId?: string;
      gatewaySignature?: string;
      source: string;
    },
  ) {
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
          paymentId: meta.paymentId,
          paymentGatewayRef: meta.gatewayOrderId,
        },
      }),
      this.prisma.payment.updateMany({
        where: { orderId },
        data: {
          status: PaymentStatus.PAID,
          gatewayPaymentId: meta.paymentId,
          gatewayOrderId: meta.gatewayOrderId,
          gatewaySignature: meta.gatewaySignature,
          paidAt: new Date(),
          metadata: { source: meta.source },
        },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.CONFIRMED,
          note: `Payment verified (${meta.source})`,
          createdBy: 'payments',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'PAYMENT_PAID',
          entity: 'Order',
          entityId: orderId,
          metadata: meta as object,
        },
      }),
    ]);
  }
}
