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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForProduct(productId, page = 1, limit = 10) {
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const where = { productId, isApproved: true };
        const [data, total] = await Promise.all([
            this.prisma.review.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.review.count({ where }),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async create(userId, productId, dto) {
        if (dto.rating < 1 || dto.rating > 5)
            throw new common_1.BadRequestException('Rating must be 1-5');
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const purchased = await this.prisma.orderItem.findFirst({
            where: {
                productId,
                order: { userId, status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING'] } },
            },
        });
        const review = await this.prisma.review.create({
            data: {
                userId,
                productId,
                rating: dto.rating,
                title: dto.title,
                body: dto.body,
                images: dto.images || [],
                isVerified: !!purchased,
                isApproved: true,
            },
        });
        await this.recalcRating(productId);
        return review;
    }
    async remove(userId, id, admin = false) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        if (!admin && review.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.prisma.review.delete({ where: { id } });
        await this.recalcRating(review.productId);
        return { message: 'Review deleted' };
    }
    async adminList(page = 1, limit = 20) {
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const [data, total] = await Promise.all([
            this.prisma.review.findMany({
                include: {
                    user: { select: { email: true, firstName: true } },
                    product: { select: { name: true, slug: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.review.count(),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async moderate(id, isApproved) {
        const review = await this.prisma.review.update({
            where: { id },
            data: { isApproved },
        });
        await this.recalcRating(review.productId);
        return review;
    }
    async recalcRating(productId) {
        const agg = await this.prisma.review.aggregate({
            where: { productId, isApproved: true },
            _avg: { rating: true },
            _count: true,
        });
        await this.prisma.product.update({
            where: { id: productId },
            data: {
                averageRating: agg._avg.rating || 0,
                reviewCount: agg._count,
            },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map