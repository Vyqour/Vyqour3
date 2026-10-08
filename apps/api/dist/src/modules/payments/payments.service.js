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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const qikink_service_1 = require("../qikink/qikink.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, config, qikink) {
        this.prisma = prisma;
        this.config = config;
        this.qikink = qikink;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.keyId = this.config.get('razorpay.keyId') || undefined;
        this.keySecret = this.config.get('razorpay.keySecret') || undefined;
        this.webhookSecret =
            this.config.get('razorpay.webhookSecret') || this.keySecret || undefined;
    }
    async createPaymentOrder(orderId, userId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: { payments: true },
        });
        if (!order)
            throw new common_1.BadRequestException('Order not found');
        if (order.paymentMethod === 'COD') {
            return { message: 'COD order — no online payment required', orderId: order.id };
        }
        if (order.paymentStatus === client_1.PaymentStatus.PAID) {
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
            throw new common_1.BadRequestException(`Payment gateway error: ${text}`);
        }
        const rzp = (await res.json());
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
    async verifyPayment(payload) {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.orderId },
            include: { payments: true },
        });
        if (!order)
            throw new common_1.BadRequestException('Order not found');
        if (order.paymentStatus === client_1.PaymentStatus.PAID) {
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
            const expected = (0, crypto_1.createHmac)('sha256', this.keySecret).update(body).digest('hex');
            if (expected !== payload.razorpaySignature) {
                throw new common_1.BadRequestException('Invalid payment signature');
            }
        }
        else if (!payload.razorpayOrderId.startsWith('order_mock_')) {
            throw new common_1.BadRequestException('Cannot verify payment without gateway secrets');
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
    async handleRazorpayWebhook(signature, rawBody, body) {
        if (this.webhookSecret) {
            if (!signature || !rawBody) {
                throw new common_1.BadRequestException('Missing Razorpay signature');
            }
            const raw = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
            const expected = (0, crypto_1.createHmac)('sha256', this.webhookSecret).update(raw).digest('hex');
            try {
                const ok = (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(signature));
                if (!ok)
                    throw new Error('mismatch');
            }
            catch {
                throw new common_1.BadRequestException('Invalid Razorpay webhook signature');
            }
        }
        else {
            this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — accepting webhook without verify (dev only)');
        }
        const event = String(body.event || '');
        const payload = (body.payload || {});
        const paymentEntity = payload.payment
            ?.entity;
        const orderEntity = payload.order?.entity;
        const gatewayPaymentId = paymentEntity?.id ? String(paymentEntity.id) : undefined;
        const gatewayOrderId = paymentEntity?.order_id
            ? String(paymentEntity.order_id)
            : orderEntity?.id
                ? String(orderEntity.id)
                : undefined;
        const notes = (paymentEntity?.notes || orderEntity?.notes || {});
        const orderIdFromNotes = notes.orderId ? String(notes.orderId) : undefined;
        const receipt = orderEntity?.receipt ? String(orderEntity.receipt) : undefined;
        if (gatewayPaymentId) {
            const existing = await this.prisma.payment.findFirst({
                where: { gatewayPaymentId },
            });
            if (existing?.status === client_1.PaymentStatus.PAID) {
                await this.qikink
                    .enqueueOrderSubmission(existing.orderId, 'webhook_duplicate')
                    .catch(() => undefined);
                return { ok: true, duplicate: true };
            }
        }
        let order = (orderIdFromNotes &&
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
        if (order.paymentStatus !== client_1.PaymentStatus.PAID) {
            await this.markOrderPaid(order.id, {
                paymentId: gatewayPaymentId,
                gatewayOrderId,
                source: `webhook:${event}`,
            });
        }
        await this.qikink.enqueueOrderSubmission(order.id, `razorpay_webhook:${event}`);
        return { ok: true, matched: true, orderId: order.id };
    }
    async markOrderPaid(orderId, meta) {
        await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    status: client_1.OrderStatus.CONFIRMED,
                    paymentId: meta.paymentId,
                    paymentGatewayRef: meta.gatewayOrderId,
                },
            }),
            this.prisma.payment.updateMany({
                where: { orderId },
                data: {
                    status: client_1.PaymentStatus.PAID,
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
                    status: client_1.OrderStatus.CONFIRMED,
                    note: `Payment verified (${meta.source})`,
                    createdBy: 'payments',
                },
            }),
            this.prisma.auditLog.create({
                data: {
                    action: 'PAYMENT_PAID',
                    entity: 'Order',
                    entityId: orderId,
                    metadata: meta,
                },
            }),
        ]);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => qikink_service_1.QikinkService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        qikink_service_1.QikinkService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map