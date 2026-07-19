"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QikinkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikinkService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
const qikink_api_client_1 = require("./client/qikink-api.client");
const qikink_job_queue_1 = require("./queue/qikink-job.queue");
const qikink_order_mapper_1 = require("./qikink-order.mapper");
const orderInclude = {
    items: {
        include: {
            product: true,
            variant: true,
        },
    },
    shippingAddress: true,
    user: { select: { email: true, firstName: true, lastName: true, phone: true } },
};
let QikinkService = QikinkService_1 = class QikinkService {
    constructor(prisma, config, client, queue, mail) {
        this.prisma = prisma;
        this.config = config;
        this.client = client;
        this.queue = queue;
        this.mail = mail;
        this.logger = new common_1.Logger(QikinkService_1.name);
    }
    isEnabled() {
        return this.client.isEnabled();
    }
    autoSubmitEnabled() {
        return this.config.get('qikink.autoSubmit') !== false;
    }
    async enqueueOrderSubmission(orderId, reason = 'auto') {
        if (!this.isEnabled() || !this.autoSubmitEnabled()) {
            this.logger.debug(`Qikink submit skipped (disabled) order=${orderId} reason=${reason}`);
            return { queued: false, reason: 'disabled' };
        }
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.qikinkOrderId || order.qikinkSyncStatus === client_1.QikinkSyncStatus.SUBMITTED) {
            return { queued: false, reason: 'already_submitted', qikinkOrderId: order.qikinkOrderId };
        }
        if (order.paymentMethod !== client_1.PaymentMethod.COD && order.paymentStatus !== client_1.PaymentStatus.PAID) {
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    qikinkSyncStatus: client_1.QikinkSyncStatus.PENDING,
                    qikinkLastError: 'Waiting for prepaid payment verification',
                },
            });
            return { queued: false, reason: 'awaiting_payment' };
        }
        const allowed = [
            client_1.OrderStatus.CONFIRMED,
            client_1.OrderStatus.PROCESSING,
            client_1.OrderStatus.SHIPPED,
        ];
        if (!allowed.includes(order.status) && order.status === client_1.OrderStatus.PENDING) {
            if (order.paymentMethod !== client_1.PaymentMethod.COD) {
                return { queued: false, reason: 'order_not_confirmed' };
            }
        }
        const idempotencyKey = order.qikinkIdempotencyKey ||
            (0, crypto_1.createHash)('sha256').update(`${order.id}:${order.orderNumber}:qikink`).digest('hex').slice(0, 32);
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                qikinkSyncStatus: client_1.QikinkSyncStatus.QUEUED,
                qikinkIdempotencyKey: idempotencyKey,
                qikinkOrderNumber: (0, qikink_order_mapper_1.toQikinkOrderNumber)(order),
                qikinkLastError: null,
            },
        });
        const job = await this.queue.enqueue(client_1.QikinkJobType.SUBMIT_ORDER, {
            orderId,
            payload: { reason, idempotencyKey },
        });
        this.logger.log(`Queued Qikink submit job=${job.id} order=${order.orderNumber} reason=${reason}`);
        return { queued: true, jobId: job.id };
    }
    async processSubmitJob(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: orderInclude,
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.qikinkOrderId) {
            return { skipped: true, qikinkOrderId: order.qikinkOrderId };
        }
        if (order.paymentMethod !== client_1.PaymentMethod.COD && order.paymentStatus !== client_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException('Cannot submit unpaid prepaid order to Qikink');
        }
        if (order.status === client_1.OrderStatus.CANCELLED || order.status === client_1.OrderStatus.REFUNDED) {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { qikinkSyncStatus: client_1.QikinkSyncStatus.CANCELLED },
            });
            return { skipped: true, reason: 'cancelled' };
        }
        const shipping = this.config.get('qikink.shipping') || '1';
        const payload = (0, qikink_order_mapper_1.mapOrderToQikinkPayload)(order, { shipping });
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                qikinkSyncStatus: client_1.QikinkSyncStatus.SUBMITTING,
                qikinkPayload: payload,
                qikinkAttempts: { increment: 1 },
                qikinkOrderNumber: String(payload.order_number),
            },
        });
        const fresh = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (fresh?.qikinkOrderId) {
            return { skipped: true, qikinkOrderId: fresh.qikinkOrderId };
        }
        try {
            const response = await this.client.createOrder(payload, orderId);
            const qikinkOrderId = response.order_id != null ? String(response.order_id) : null;
            if (!qikinkOrderId) {
                throw new Error(`Qikink create order succeeded without order_id: ${JSON.stringify(response)}`);
            }
            await this.prisma.$transaction([
                this.prisma.order.update({
                    where: { id: orderId },
                    data: {
                        qikinkOrderId,
                        qikinkStatus: 'submitted',
                        qikinkSyncStatus: client_1.QikinkSyncStatus.SUBMITTED,
                        qikinkSyncedAt: new Date(),
                        qikinkResponse: response,
                        qikinkLastError: null,
                        status: order.status === client_1.OrderStatus.CONFIRMED || order.status === client_1.OrderStatus.PENDING
                            ? client_1.OrderStatus.PROCESSING
                            : order.status,
                    },
                }),
                this.prisma.orderStatusHistory.create({
                    data: {
                        orderId,
                        status: order.status === client_1.OrderStatus.CONFIRMED || order.status === client_1.OrderStatus.PENDING
                            ? client_1.OrderStatus.PROCESSING
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
            if (this.config.get('qikink.statusPollEnabled')) {
                await this.queue.enqueue(client_1.QikinkJobType.SYNC_ORDER_STATUS, {
                    orderId,
                    runAfter: new Date(Date.now() + 10 * 60 * 1000),
                });
            }
            return { success: true, qikinkOrderId, response };
        }
        catch (err) {
            const message = err.message;
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    qikinkSyncStatus: client_1.QikinkSyncStatus.FAILED,
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
    async processStatusSync(orderId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order?.qikinkOrderId && !order?.qikinkOrderNumber) {
            return { skipped: true };
        }
        const status = await this.client.getOrderStatus({
            orderId: order.qikinkOrderId || undefined,
            orderNumber: order.qikinkOrderNumber || undefined,
            internalOrderId: order.id,
        });
        if (!status)
            return { skipped: true, reason: 'status_endpoint_unavailable' };
        return this.applyFulfillmentUpdate(order.id, {
            status: status.status || status.order_status,
            awb: status.awb || status.tracking_number,
            courier: status.courier || status.carrier,
            raw: status,
            source: 'poll',
        });
    }
    async applyFulfillmentUpdate(orderId, update) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: { select: { email: true, firstName: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const mapped = (0, qikink_order_mapper_1.mapQikinkStatusToOrderStatus)(update.status);
        const data = {
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
            const rank = {
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
                data.status = mapped;
                statusChanged = true;
                if (mapped === 'SHIPPED' || mapped === 'OUT_FOR_DELIVERY') {
                    data.shippedAt = order.shippedAt || new Date();
                    data.qikinkShippedAt = order.qikinkShippedAt || new Date();
                    becameShipped = !order.shippedAt;
                }
                if (mapped === 'DELIVERED') {
                    data.deliveredAt = order.deliveredAt || new Date();
                    if (order.paymentMethod === client_1.PaymentMethod.COD) {
                        data.paymentStatus = client_1.PaymentStatus.PAID;
                    }
                }
                if (mapped === 'CANCELLED') {
                    data.cancelledAt = order.cancelledAt || new Date();
                    data.qikinkSyncStatus = client_1.QikinkSyncStatus.CANCELLED;
                }
            }
        }
        await this.prisma.order.update({ where: { id: orderId }, data });
        if (statusChanged && mapped) {
            await this.prisma.orderStatusHistory.create({
                data: {
                    orderId,
                    status: mapped,
                    note: `Qikink ${update.source}: ${update.status || mapped}`,
                    createdBy: 'qikink',
                },
            });
        }
        if (becameShipped && order.user?.email) {
            await this.mail.sendShippingNotification(order.user.email, order.orderNumber, update.awb || order.trackingNumber || undefined, update.courier || order.carrier || undefined);
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
                    raw: update.raw,
                },
            },
        });
        return { orderId, mapped, status: update.status };
    }
    async handleWebhook(headers, rawBody, body) {
        const signatureHeader = headers['x-qikink-signature'] ||
            headers['x-signature'] ||
            headers['x-hub-signature-256'] ||
            '';
        const secret = this.config.get('qikink.webhookSecret') || '';
        let signatureValid = false;
        if (secret && signatureHeader && rawBody) {
            const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
            const expected = (0, crypto_1.createHmac)('sha256', secret).update(raw).digest('hex');
            const provided = signatureHeader.replace(/^sha256=/i, '').trim();
            try {
                signatureValid = (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(provided));
            }
            catch {
                signatureValid = false;
            }
            if (!signatureValid) {
                throw new common_1.BadRequestException('Invalid Qikink webhook signature');
            }
        }
        else if (secret) {
            throw new common_1.BadRequestException('Missing Qikink webhook signature');
        }
        else {
            signatureValid = true;
        }
        const eventType = String(body.event || body.event_type || body.type || body.status || 'order.status');
        const qikinkOrderId = body.order_id != null ? String(body.order_id) : body.qikink_order_id != null ? String(body.qikink_order_id) : null;
        const orderNumber = body.order_number != null ? String(body.order_number) : body.orderNumber != null ? String(body.orderNumber) : null;
        const eventId = body.event_id ||
            body.id ||
            (0, crypto_1.createHash)('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 40);
        const existing = await this.prisma.qikinkWebhookEvent.findUnique({ where: { eventId } });
        if (existing?.processed) {
            return { ok: true, duplicate: true };
        }
        let order = (qikinkOrderId &&
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
                payload: body,
                signatureValid,
            },
            update: {
                payload: body,
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
                requestBody: body,
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
            const awb = (body.awb || body.tracking_number || body.trackingNumber);
            const courier = (body.courier || body.carrier || body.shipping_partner);
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
        }
        catch (err) {
            await this.prisma.qikinkWebhookEvent.update({
                where: { id: event.id },
                data: { error: err.message },
            });
            throw err;
        }
    }
    async syncProducts() {
        if (!this.isEnabled())
            throw new common_1.BadRequestException('Qikink disabled');
        try {
            const data = await this.client.listProducts();
            const items = Array.isArray(data)
                ? data
                : Array.isArray(data?.products)
                    ? (data.products)
                    : Array.isArray(data?.data)
                        ? (data.data)
                        : [];
            let upserts = 0;
            for (const raw of items) {
                const row = raw;
                const sku = String(row.sku || row.SKU || row.product_sku || '');
                if (!sku)
                    continue;
                await this.prisma.qikinkProductCatalog.upsert({
                    where: { qikinkSku: sku },
                    create: {
                        qikinkSku: sku,
                        name: (row.name || row.product_name || null),
                        category: (row.category || null),
                        color: (row.color || null),
                        size: (row.size || null),
                        basePrice: row.price != null ? Number(row.price) : undefined,
                        printTypeId: row.print_type_id != null ? Number(row.print_type_id) : undefined,
                        raw: row,
                        lastSyncedAt: new Date(),
                    },
                    update: {
                        name: (row.name || row.product_name || null),
                        category: (row.category || null),
                        color: (row.color || null),
                        size: (row.size || null),
                        basePrice: row.price != null ? Number(row.price) : undefined,
                        printTypeId: row.print_type_id != null ? Number(row.print_type_id) : undefined,
                        raw: row,
                        lastSyncedAt: new Date(),
                    },
                });
                upserts += 1;
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
                note: upserts === 0
                    ? 'No products returned. Public Qikink docs primarily cover order create; product listing requires Live API access / correct endpoint for your account. Map SKUs manually via admin if needed.'
                    : undefined,
            };
        }
        catch (err) {
            return {
                success: false,
                error: err.message,
                limitation: 'Qikink public API documentation (Postman 08-23) documents Authorization + Create Order. Product catalog sync endpoint may be unavailable on Sandbox or require Live Custom API approval. Closest alternative: maintain qikinkSku on Product/ProductVariant (admin) and use search_from_my_products=1 on Live.',
            };
        }
    }
    async getOrderFulfillment(orderId) {
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
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async adminRetry(orderId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.qikinkOrderId) {
            return { message: 'Already submitted', qikinkOrderId: order.qikinkOrderId };
        }
        await this.queue.requeueDead(orderId);
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                qikinkSyncStatus: client_1.QikinkSyncStatus.QUEUED,
                qikinkLastError: null,
            },
        });
        return this.enqueueOrderSubmission(orderId, 'admin_retry');
    }
};
exports.QikinkService = QikinkService;
exports.QikinkService = QikinkService = QikinkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        qikink_api_client_1.QikinkApiClient,
        qikink_job_queue_1.QikinkJobQueue,
        mail_service_1.MailService])
], QikinkService);
//# sourceMappingURL=qikink.service.js.map