import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QikinkJobType,
  QikinkSyncStatus,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { QikinkApiClient } from './client/qikink-api.client';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import {
  mapOrderToQikinkPayload,
  mapQikinkStatusToOrderStatus,
  toQikinkOrderNumber,
} from './qikink-order.mapper';

const orderInclude = {
  items: {
    include: {
      product: true,
      variant: true,
    },
  },
  shippingAddress: true,
  user: { select: { email: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class QikinkService {
  private readonly logger = new Logger(QikinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly client: QikinkApiClient,
    private readonly queue: QikinkJobQueue,
    private readonly mail: MailService,
  ) {}

  isEnabled() {
    return this.client.isEnabled();
  }

  autoSubmitEnabled() {
    return this.config.get<boolean>('qikink.autoSubmit') !== false;
  }

  /**
   * Called after order is confirmed (COD immediately, prepaid after payment).
   * Idempotent — safe to call multiple times.
   */
  async enqueueOrderSubmission(orderId: string, reason = 'auto') {
    if (!this.isEnabled() || !this.autoSubmitEnabled()) {
      this.logger.debug(`Qikink submit skipped (disabled) order=${orderId} reason=${reason}`);
      return { queued: false, reason: 'disabled' };
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.qikinkOrderId || order.qikinkSyncStatus === QikinkSyncStatus.SUBMITTED) {
      return { queued: false, reason: 'already_submitted', qikinkOrderId: order.qikinkOrderId };
    }

    // Prepaid must be PAID before Qikink submission
    if (order.paymentMethod !== PaymentMethod.COD && order.paymentStatus !== PaymentStatus.PAID) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          qikinkSyncStatus: QikinkSyncStatus.PENDING,
          qikinkLastError: 'Waiting for prepaid payment verification',
        },
      });
      return { queued: false, reason: 'awaiting_payment' };
    }

    // Only confirmed+ orders
    const allowed: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
    ];
    if (!allowed.includes(order.status) && order.status === OrderStatus.PENDING) {
      // COD path may still be pending briefly — allow CONFIRMED only
      if (order.paymentMethod !== PaymentMethod.COD) {
        return { queued: false, reason: 'order_not_confirmed' };
      }
    }

    const idempotencyKey =
      order.qikinkIdempotencyKey ||
      createHash('sha256').update(`${order.id}:${order.orderNumber}:qikink`).digest('hex').slice(0, 32);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        qikinkSyncStatus: QikinkSyncStatus.QUEUED,
        qikinkIdempotencyKey: idempotencyKey,
        qikinkOrderNumber: toQikinkOrderNumber(order),
        qikinkLastError: null,
      },
    });

    const job = await this.queue.enqueue(QikinkJobType.SUBMIT_ORDER, {
      orderId,
      payload: { reason, idempotencyKey },
    });

    this.logger.log(`Queued Qikink submit job=${job.id} order=${order.orderNumber} reason=${reason}`);
    return { queued: true, jobId: job.id };
  }

  async processSubmitJob(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.qikinkOrderId) {
      return { skipped: true, qikinkOrderId: order.qikinkOrderId };
    }

    if (order.paymentMethod !== PaymentMethod.COD && order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Cannot submit unpaid prepaid order to Qikink');
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { qikinkSyncStatus: QikinkSyncStatus.CANCELLED },
      });
      return { skipped: true, reason: 'cancelled' };
    }

    const shipping = this.config.get<string>('qikink.shipping') || '1';
    const payload = mapOrderToQikinkPayload(order, { shipping });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        qikinkSyncStatus: QikinkSyncStatus.SUBMITTING,
        qikinkPayload: payload as object,
        qikinkAttempts: { increment: 1 },
        qikinkOrderNumber: String(payload.order_number),
      },
    });

    // Double-check race: another worker may have submitted
    const fresh = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (fresh?.qikinkOrderId) {
      return { skipped: true, qikinkOrderId: fresh.qikinkOrderId };
    }

    try {
      const response = await this.client.createOrder(payload, orderId);
      const qikinkOrderId = response.order_id != null ? String(response.order_id) : null;
      if (!qikinkOrderId) {
        throw new Error(
          `Qikink create order succeeded without order_id: ${JSON.stringify(response)}`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: orderId },
          data: {
            qikinkOrderId,
            qikinkStatus: 'submitted',
            qikinkSyncStatus: QikinkSyncStatus.SUBMITTED,
            qikinkSyncedAt: new Date(),
            qikinkResponse: response as object,
            qikinkLastError: null,
            status:
              order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PENDING
                ? OrderStatus.PROCESSING
                : order.status,
          },
        }),
        this.prisma.orderStatusHistory.create({
          data: {
            orderId,
            status:
              order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PENDING
                ? OrderStatus.PROCESSING
                : order.status,
            note: `Submitted to Qikink (ID ${qikinkOrderId})`,
            createdBy: 'qikink',
          },
        }),
        this.prisma.auditLog.create({
          data: {
            action: 'QIKINK_ORDER_SUBMITTED',
            entity: 'Order',
            entityId: orderId,
            metadata: { qikinkOrderId, payloadOrderNumber: payload.order_number },
          },
        }),
      ]);

      // Optional status follow-up job
      if (this.config.get<boolean>('qikink.statusPollEnabled')) {
        await this.queue.enqueue(QikinkJobType.SYNC_ORDER_STATUS, {
          orderId,
          runAfter: new Date(Date.now() + 10 * 60 * 1000),
        });
      }

      return { success: true, qikinkOrderId, response };
    } catch (err) {
      const message = (err as Error).message;
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          qikinkSyncStatus: QikinkSyncStatus.FAILED,
          qikinkLastError: message.slice(0, 1000),
        },
      });
      await this.prisma.auditLog.create({
        data: {
          action: 'QIKINK_ORDER_SUBMIT_FAILED',
          entity: 'Order',
          entityId: orderId,
          metadata: { error: message.slice(0, 500) },
        },
      });
      throw err;
    }
  }

  async processStatusSync(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.qikinkOrderId && !order?.qikinkOrderNumber) {
      return { skipped: true };
    }
    const status = await this.client.getOrderStatus({
      orderId: order.qikinkOrderId || undefined,
      orderNumber: order.qikinkOrderNumber || undefined,
      internalOrderId: order.id,
    });
    if (!status) return { skipped: true, reason: 'status_endpoint_unavailable' };
    return this.applyFulfillmentUpdate(order.id, {
      status: status.status || status.order_status,
      awb: status.awb || status.tracking_number,
      courier: status.courier || status.carrier,
      raw: status,
      source: 'poll',
    });
  }

  async applyFulfillmentUpdate(
    orderId: string,
    update: {
      status?: string | null;
      awb?: string | null;
      courier?: string | null;
      raw?: unknown;
      source: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, firstName: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const mapped = mapQikinkStatusToOrderStatus(update.status);
    const data: Prisma.OrderUpdateInput = {
      qikinkStatus: update.status || order.qikinkStatus,
      qikinkSyncedAt: new Date(),
    };
    if (update.awb) {
      data.qikinkAwb = update.awb;
      data.trackingNumber = update.awb;
    }
    if (update.courier) {
      data.qikinkCourier = update.courier;
      data.carrier = update.courier;
    }

    let statusChanged = false;
    let becameShipped = false;
    if (mapped && mapped !== order.status) {
      // Don't regress terminal states
      const rank: Record<string, number> = {
        PENDING: 0,
        CONFIRMED: 1,
        PROCESSING: 2,
        SHIPPED: 3,
        OUT_FOR_DELIVERY: 4,
        DELIVERED: 5,
        CANCELLED: 9,
        REFUNDED: 9,
        RETURNED: 9,
      };
      if ((rank[mapped] || 0) >= (rank[order.status] || 0) || mapped === 'CANCELLED') {
        data.status = mapped as OrderStatus;
        statusChanged = true;
        if (mapped === 'SHIPPED' || mapped === 'OUT_FOR_DELIVERY') {
          data.shippedAt = order.shippedAt || new Date();
          data.qikinkShippedAt = order.qikinkShippedAt || new Date();
          becameShipped = !order.shippedAt;
        }
        if (mapped === 'DELIVERED') {
          data.deliveredAt = order.deliveredAt || new Date();
          if (order.paymentMethod === PaymentMethod.COD) {
            data.paymentStatus = PaymentStatus.PAID;
          }
        }
        if (mapped === 'CANCELLED') {
          data.cancelledAt = order.cancelledAt || new Date();
          data.qikinkSyncStatus = QikinkSyncStatus.CANCELLED;
        }
      }
    }

    await this.prisma.order.update({ where: { id: orderId }, data });

    if (statusChanged && mapped) {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: mapped as OrderStatus,
          note: `Qikink ${update.source}: ${update.status || mapped}`,
          createdBy: 'qikink',
        },
      });
    }

    if (becameShipped && order.user?.email) {
      await this.mail.sendShippingNotification(
        order.user.email,
        order.orderNumber,
        update.awb || order.trackingNumber || undefined,
        update.courier || order.carrier || undefined,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'QIKINK_STATUS_UPDATE',
        entity: 'Order',
        entityId: orderId,
        metadata: {
          source: update.source,
          status: update.status,
          mapped,
          awb: update.awb,
          raw: update.raw as object,
        },
      },
    });

    return { orderId, mapped, status: update.status };
  }

  /**
   * Inbound webhook from Qikink or a middleware that forwards fulfillment events.
   * Public Qikink docs focus on order create; webhooks are account-configured.
   * We accept a flexible payload and verify optional HMAC signature.
   */
  async handleWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string | undefined,
    body: Record<string, unknown>,
  ) {
    const signatureHeader =
      (headers['x-qikink-signature'] as string) ||
      (headers['x-signature'] as string) ||
      (headers['x-hub-signature-256'] as string) ||
      '';
    const secret = this.config.get<string>('qikink.webhookSecret') || '';
    let signatureValid = false;
    if (secret && signatureHeader && rawBody) {
      const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expected = createHmac('sha256', secret).update(raw).digest('hex');
      const provided = signatureHeader.replace(/^sha256=/i, '').trim();
      try {
        signatureValid = timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
      } catch {
        signatureValid = false;
      }
      if (!signatureValid) {
        throw new BadRequestException('Invalid Qikink webhook signature');
      }
    } else if (secret) {
      // Secret configured but signature missing
      throw new BadRequestException('Missing Qikink webhook signature');
    } else {
      // Dev mode without secret
      signatureValid = true;
    }

    const eventType = String(
      body.event || body.event_type || body.type || body.status || 'order.status',
    );
    const qikinkOrderId = body.order_id != null ? String(body.order_id) : body.qikink_order_id != null ? String(body.qikink_order_id) : null;
    const orderNumber = body.order_number != null ? String(body.order_number) : body.orderNumber != null ? String(body.orderNumber) : null;
    const eventId =
      (body.event_id as string) ||
      (body.id as string) ||
      createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 40);

    const existing = await this.prisma.qikinkWebhookEvent.findUnique({ where: { eventId } });
    if (existing?.processed) {
      return { ok: true, duplicate: true };
    }

    let order =
      (qikinkOrderId &&
        (await this.prisma.order.findFirst({ where: { qikinkOrderId } }))) ||
      (orderNumber &&
        (await this.prisma.order.findFirst({
          where: {
            OR: [{ qikinkOrderNumber: orderNumber }, { orderNumber }],
          },
        }))) ||
      null;

    const event = await this.prisma.qikinkWebhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType,
        qikinkOrderId: qikinkOrderId || undefined,
        orderId: order?.id,
        payload: body as object,
        signatureValid,
      },
      update: {
        payload: body as object,
        signatureValid,
      },
    });

    await this.prisma.qikinkApiLog.create({
      data: {
        direction: 'inbound',
        method: 'WEBHOOK',
        path: '/qikink/webhooks',
        orderId: order?.id,
        success: true,
        requestBody: body as object,
      },
    });

    if (!order) {
      await this.prisma.qikinkWebhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date(), error: 'Order not found' },
      });
      return { ok: true, matched: false };
    }

    try {
      const status = String(body.status || body.order_status || body.fulfillment_status || eventType);
      const awb = (body.awb || body.tracking_number || body.trackingNumber) as string | undefined;
      const courier = (body.courier || body.carrier || body.shipping_partner) as string | undefined;
      await this.applyFulfillmentUpdate(order.id, {
        status,
        awb,
        courier,
        raw: body,
        source: 'webhook',
      });
      await this.prisma.qikinkWebhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date(), orderId: order.id },
      });
      return { ok: true, matched: true, orderId: order.id };
    } catch (err) {
      await this.prisma.qikinkWebhookEvent.update({
        where: { id: event.id },
        data: { error: (err as Error).message },
      });
      throw err;
    }
  }

  async syncProducts() {
    if (!this.isEnabled()) throw new BadRequestException('Qikink disabled');
    try {
      const data = await this.client.listProducts();
      const items = Array.isArray(data)
        ? data
        : Array.isArray((data as { products?: unknown[] })?.products)
          ? ((data as { products: unknown[] }).products)
          : Array.isArray((data as { data?: unknown[] })?.data)
            ? ((data as { data: unknown[] }).data)
            : [];

      let upserts = 0;
      for (const raw of items) {
        const row = raw as Record<string, unknown>;
        const sku = String(row.sku || row.SKU || row.product_sku || '');
        if (!sku) continue;
        await this.prisma.qikinkProductCatalog.upsert({
          where: { qikinkSku: sku },
          create: {
            qikinkSku: sku,
            name: (row.name || row.product_name || null) as string | null,
            category: (row.category || null) as string | null,
            color: (row.color || null) as string | null,
            size: (row.size || null) as string | null,
            basePrice: row.price != null ? Number(row.price) : undefined,
            printTypeId: row.print_type_id != null ? Number(row.print_type_id) : undefined,
            raw: row as object,
            lastSyncedAt: new Date(),
          },
          update: {
            name: (row.name || row.product_name || null) as string | null,
            category: (row.category || null) as string | null,
            color: (row.color || null) as string | null,
            size: (row.size || null) as string | null,
            basePrice: row.price != null ? Number(row.price) : undefined,
            printTypeId: row.print_type_id != null ? Number(row.print_type_id) : undefined,
            raw: row as object,
            lastSyncedAt: new Date(),
          },
        });
        upserts += 1;

        // Soft-match local variants by qikinkSku or sku
        await this.prisma.productVariant.updateMany({
          where: { OR: [{ qikinkSku: sku }, { sku }] },
          data: {
            qikinkSku: sku,
            qikinkPrice: row.price != null ? Number(row.price) : undefined,
          },
        });
        await this.prisma.product.updateMany({
          where: { OR: [{ qikinkSku: sku }, { sku }] },
          data: { qikinkSku: sku, qikinkSyncedAt: new Date() },
        });
      }

      return {
        success: true,
        imported: upserts,
        note:
          upserts === 0
            ? 'No products returned. Public Qikink docs primarily cover order create; product listing requires Live API access / correct endpoint for your account. Map SKUs manually via admin if needed.'
            : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        limitation:
          'Qikink public API documentation (Postman 08-23) documents Authorization + Create Order. Product catalog sync endpoint may be unavailable on Sandbox or require Live Custom API approval. Closest alternative: maintain qikinkSku on Product/ProductVariant (admin) and use search_from_my_products=1 on Live.',
      };
    }
  }

  async getOrderFulfillment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        qikinkOrderId: true,
        qikinkOrderNumber: true,
        qikinkStatus: true,
        qikinkSyncStatus: true,
        qikinkSyncedAt: true,
        qikinkLastError: true,
        qikinkAttempts: true,
        qikinkAwb: true,
        qikinkCourier: true,
        trackingNumber: true,
        carrier: true,
        qikinkJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        qikinkEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async adminRetry(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.qikinkOrderId) {
      return { message: 'Already submitted', qikinkOrderId: order.qikinkOrderId };
    }
    await this.queue.requeueDead(orderId);
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        qikinkSyncStatus: QikinkSyncStatus.QUEUED,
        qikinkLastError: null,
      },
    });
    return this.enqueueOrderSubmission(orderId, 'admin_retry');
  }
}
