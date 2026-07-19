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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WishlistService = class WishlistService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId) {
        return this.prisma.wishlistItem.findMany({
            where: { userId },
            include: {
                product: {
                    include: {
                        images: { where: { isPrimary: true }, take: 1 },
                        category: { select: { name: true, slug: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async add(userId, productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product || product.status !== 'ACTIVE')
            throw new common_1.NotFoundException('Product not found');
        try {
            return await this.prisma.wishlistItem.create({
                data: { userId, productId },
                include: { product: true },
            });
        }
        catch {
            throw new common_1.ConflictException('Already in wishlist');
        }
    }
    async remove(userId, productId) {
        await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
        return { message: 'Removed from wishlist' };
    }
    async toggle(userId, productId) {
        const existing = await this.prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (existing) {
            await this.remove(userId, productId);
            return { inWishlist: false };
        }
        await this.add(userId, productId);
        return { inWishlist: true };
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map