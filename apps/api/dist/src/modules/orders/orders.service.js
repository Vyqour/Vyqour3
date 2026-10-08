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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
const cart_service_1 = require("../cart/cart.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const slug_util_1 = require("../../common/utils/slug.util");
const qikink_service_1 = require("../qikink/qikink.service");
let OrdersService = class OrdersService {
    constructor(prisma, cart, mail, qikink) {
        this.prisma = prisma;
        this.cart = cart;
        this.mail = mail;
        this.qikink = qikink;
    }
    async create(userId, dto) {
        const cart = await this.cart.getCart(userId);
        if (!cart.items.length)
            throw new common_1.BadRequestException('Cart is empty');
        const address = await this.prisma.address.findFirst({
            where: { id: dto.shippingAddressId, userId },
        });
        if (!address)
            throw new common_1.BadRequestException('Invalid shipping address');
        for (const item of cart.items) {
            if (item.variantId && item.variant) {
                if (item.variant.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for ${item.product.name}`);
                }
            }
        }
        const orderNumber = (0, slug_util_1.generateOrderNumber)();
        const summary = cart.summary;
        const order = await this.prisma.$transaction(async (tx) => {
            const created = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    status: client_1.OrderStatus.PENDING,
                    paymentStatus: dto.paymentMethod === client_1.PaymentMethod.COD
                        ? client_1.PaymentStatus.PENDING
                        : client_1.PaymentStatus.PENDING,
                    paymentMethod: dto.paymentMethod,
                    subtotal: summary.subtotal,
                    discountAmount: summary.discountAmount,
                    shippingAmount: summary.shippingAmount,
                    taxAmount: summary.taxAmount,
                    total: summary.total,
                    couponCode: summary.couponCode || dto.couponCode,
                    shippingAddressId: dto.shippingAddressId,
                    billingAddressId: dto.billingAddressId || dto.shippingAddressId,
                    notes: dto.notes,
                    items: {
                        create: cart.items.map((item) => ({
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.product.name,
                            variantLabel: [item.variant?.size, item.variant?.color].filter(Boolean).join(' / ') || null,
                            sku: item.variant?.sku,
                            imageUrl: item.product.images[0]?.url,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            totalPrice: item.lineTotal,
                        })),
                    },
                    statusHistory: {
                        create: { status: client_1.OrderStatus.PENDING, note: 'Order placed' },
                    },
                    payments: {
                        create: {
                            amount: summary.total,
                            method: dto.paymentMethod,
                            status: client_1.PaymentStatus.PENDING,
                        },
                    },
                },
                include: {
                    items: true,
                    shippingAddress: true,
                    user: { select: { email: true, firstName: true } },
                },
            });
            for (const item of cart.items) {
                if (item.variantId) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }
                await tx.product.update({
                    where: { id: item.productId },
                    data: { totalSold: { increment: item.quantity } },
                });
            }
            if (summary.couponCode) {
                await tx.coupon.updateMany({
                    where: { code: summary.couponCode },
                    data: { usageCount: { increment: 1 } },
                });
            }
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
            if (dto.paymentMethod === client_1.PaymentMethod.COD) {
                await tx.order.update({
                    where: { id: created.id },
                    data: { status: client_1.OrderStatus.CONFIRMED },
                });
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: created.id,
                        status: client_1.OrderStatus.CONFIRMED,
                        note: 'COD order confirmed',
                    },
                });
            }
            return created;
        });
        await this.mail.sendOrderConfirmation(order.user.email, order.orderNumber, String(order.total));
        if (dto.paymentMethod === client_1.PaymentMethod.COD) {
            await this.qikink.enqueueOrderSubmission(order.id, 'cod_confirmed').catch(() => undefined);
        }
        return this.findOne(order.id, userId);
    }
    async findMyOrders(userId, query) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = { userId };
        if (query.status)
            where.status = query.status;
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    items: true,
                    shippingAddress: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.order.count({ where }),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async findOne(idOrNumber, userId, admin = false) {
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
            },
            include: {
                items: { include: { product: { select: { slug: true } } } },
                shippingAddress: true,
                billingAddress: true,
                statusHistory: { orderBy: { createdAt: 'asc' } },
                payments: true,
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (!admin && userId && order.userId !== userId) {
            throw new common_1.ForbiddenException();
        }
        return order;
    }
    async track(orderNumber, email) {
        const order = await this.prisma.order.findUnique({
            where: { orderNumber },
            include: {
                statusHistory: { orderBy: { createdAt: 'asc' } },
                items: true,
                user: { select: { email: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (email && order.user.email.toLowerCase() !== email.toLowerCase()) {
            throw new common_1.NotFoundException('Order not found');
        }
        return {
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            estimatedDelivery: order.estimatedDelivery,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            createdAt: order.createdAt,
            items: order.items,
            statusHistory: order.statusHistory,
        };
    }
    async updateStatus(id, dto, adminId) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const status = dto.status;
        if (!Object.values(client_1.OrderStatus).includes(status)) {
            throw new common_1.BadRequestException('Invalid status');
        }
        const data = { status };
        if (dto.trackingNumber)
            data.trackingNumber = dto.trackingNumber;
        if (dto.carrier)
            data.carrier = dto.carrier;
        if (status === client_1.OrderStatus.SHIPPED)
            data.shippedAt = new Date();
        if (status === client_1.OrderStatus.DELIVERED) {
            data.deliveredAt = new Date();
            data.paymentStatus =
                order.paymentMethod === client_1.PaymentMethod.COD ? client_1.PaymentStatus.PAID : order.paymentStatus;
        }
        if (status === client_1.OrderStatus.CANCELLED)
            data.cancelledAt = new Date();
        await this.prisma.$transaction([
            this.prisma.order.update({ where: { id }, data }),
            this.prisma.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status,
                    note: dto.note,
                    createdBy: adminId,
                },
            }),
        ]);
        return this.findOne(id, undefined, true);
    }
    async cancel(id, userId, reason) {
        const order = await this.findOne(id, userId);
        const cancellable = [client_1.OrderStatus.PENDING, client_1.OrderStatus.CONFIRMED];
        if (!cancellable.includes(order.status)) {
            throw new common_1.BadRequestException('Order cannot be cancelled at this stage');
        }
        await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancelledAt: new Date(),
                    cancelReason: reason,
                },
            }),
            this.prisma.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    status: client_1.OrderStatus.CANCELLED,
                    note: reason || 'Cancelled by customer',
                    createdBy: userId,
                },
            }),
        ]);
        for (const item of order.items) {
            if (item.variantId) {
                await this.prisma.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { increment: item.quantity } },
                });
            }
        }
        return this.findOne(order.id, userId);
    }
    async adminList(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.search) {
            where.OR = [
                { orderNumber: { contains: query.search, mode: 'insensitive' } },
                { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    items: true,
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.order.count({ where }),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => qikink_service_1.QikinkService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cart_service_1.CartService,
        mail_service_1.MailService,
        qikink_service_1.QikinkService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map