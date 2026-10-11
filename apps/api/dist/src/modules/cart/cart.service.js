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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const cartInclude = {
    items: {
        include: {
            product: {
                include: {
                    images: { where: { isPrimary: true }, take: 1 },
                },
            },
            variant: true,
        },
        orderBy: { createdAt: 'desc' },
    },
};
let CartService = class CartService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateCart(userId, sessionId) {
        if (userId) {
            let cart = await this.prisma.cart.findUnique({
                where: { userId },
                include: cartInclude,
            });
            if (!cart) {
                cart = await this.prisma.cart.create({
                    data: { userId },
                    include: cartInclude,
                });
            }
            return cart;
        }
        if (!sessionId)
            throw new common_1.BadRequestException('sessionId required for guest cart');
        let cart = await this.prisma.cart.findUnique({
            where: { sessionId },
            include: cartInclude,
        });
        if (!cart) {
            cart = await this.prisma.cart.create({
                data: { sessionId },
                include: cartInclude,
            });
        }
        return cart;
    }
    async getCart(userId, sessionId) {
        const cart = await this.getOrCreateCart(userId, sessionId);
        return this.withTotals(cart);
    }
    async addItem(dto, userId, sessionId) {
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            include: { variants: true },
        });
        if (!product || product.status !== 'ACTIVE') {
            throw new common_1.NotFoundException('Product not available');
        }
        if (dto.variantId) {
            const variant = product.variants.find((v) => v.id === dto.variantId);
            if (!variant || !variant.isActive)
                throw new common_1.BadRequestException('Invalid variant');
            if (variant.stock < dto.quantity)
                throw new common_1.BadRequestException('Insufficient stock');
        }
        const cart = await this.getOrCreateCart(userId, sessionId);
        const existing = cart.items.find((i) => i.productId === dto.productId && i.variantId === (dto.variantId || null));
        if (existing) {
            await this.prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + dto.quantity },
            });
        }
        else {
            await this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: dto.productId,
                    variantId: dto.variantId,
                    quantity: dto.quantity,
                },
            });
        }
        return this.getCart(userId, sessionId);
    }
    async updateItem(itemId, dto, userId, sessionId) {
        const cart = await this.getOrCreateCart(userId, sessionId);
        const item = cart.items.find((i) => i.id === itemId);
        if (!item)
            throw new common_1.NotFoundException('Cart item not found');
        if (dto.quantity === 0) {
            await this.prisma.cartItem.delete({ where: { id: itemId } });
        }
        else {
            await this.prisma.cartItem.update({
                where: { id: itemId },
                data: { quantity: dto.quantity },
            });
        }
        return this.getCart(userId, sessionId);
    }
    async removeItem(itemId, userId, sessionId) {
        const cart = await this.getOrCreateCart(userId, sessionId);
        const item = cart.items.find((i) => i.id === itemId);
        if (!item)
            throw new common_1.NotFoundException('Cart item not found');
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return this.getCart(userId, sessionId);
    }
    async clear(userId, sessionId) {
        const cart = await this.getOrCreateCart(userId, sessionId);
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await this.prisma.cart.update({
            where: { id: cart.id },
            data: { couponCode: null },
        });
        return this.getCart(userId, sessionId);
    }
    async applyCoupon(code, userId, sessionId) {
        const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon || !coupon.isActive)
            throw new common_1.BadRequestException('Invalid coupon');
        if (coupon.expiresAt < new Date() || coupon.startsAt > new Date()) {
            throw new common_1.BadRequestException('Coupon not active');
        }
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new common_1.BadRequestException('Coupon usage limit reached');
        }
        const cart = await this.getOrCreateCart(userId, sessionId);
        await this.prisma.cart.update({
            where: { id: cart.id },
            data: { couponCode: coupon.code },
        });
        return this.getCart(userId, sessionId);
    }
    async mergeGuestCart(userId, sessionId) {
        const guest = await this.prisma.cart.findUnique({
            where: { sessionId },
            include: { items: true },
        });
        if (!guest?.items.length)
            return this.getCart(userId);
        const userCart = await this.getOrCreateCart(userId);
        for (const item of guest.items) {
            const existing = userCart.items.find((i) => i.productId === item.productId && i.variantId === item.variantId);
            if (existing) {
                await this.prisma.cartItem.update({
                    where: { id: existing.id },
                    data: { quantity: existing.quantity + item.quantity },
                });
            }
            else {
                await this.prisma.cartItem.create({
                    data: {
                        cartId: userCart.id,
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                    },
                });
            }
        }
        await this.prisma.cartItem.deleteMany({ where: { cartId: guest.id } });
        await this.prisma.cart.delete({ where: { id: guest.id } });
        return this.getCart(userId);
    }
    async withTotals(cart) {
        let subtotal = 0;
        const items = cart.items.map((item) => {
            const unit = item.variant?.price != null
                ? Number(item.variant.price)
                : Number(item.product.basePrice);
            const lineTotal = unit * item.quantity;
            subtotal += lineTotal;
            return { ...item, unitPrice: unit, lineTotal };
        });
        let discountAmount = 0;
        let coupon = null;
        if (cart.couponCode) {
            coupon = await this.prisma.coupon.findUnique({ where: { code: cart.couponCode } });
            if (coupon && coupon.isActive && coupon.expiresAt >= new Date()) {
                if (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount)) {
                    if (coupon.type === 'PERCENTAGE') {
                        discountAmount = (subtotal * Number(coupon.value)) / 100;
                        if (coupon.maxDiscount) {
                            discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
                        }
                    }
                    else if (coupon.type === 'FIXED') {
                        discountAmount = Math.min(Number(coupon.value), subtotal);
                    }
                }
            }
        }
        const shippingAmount = subtotal - discountAmount >= 1999 || coupon?.type === 'FREE_SHIPPING' ? 0 : 99;
        const taxAmount = Math.round((subtotal - discountAmount) * 0.05 * 100) / 100;
        const total = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);
        return {
            ...cart,
            items,
            summary: {
                subtotal: round2(subtotal),
                discountAmount: round2(discountAmount),
                shippingAmount: round2(shippingAmount),
                taxAmount: round2(taxAmount),
                total: round2(total),
                currency: 'INR',
                itemCount: items.reduce((s, i) => s + i.quantity, 0),
                couponCode: cart.couponCode,
            },
        };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
function round2(n) {
    return Math.round(n * 100) / 100;
}
//# sourceMappingURL=cart.service.js.map