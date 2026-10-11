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
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let CouponsService = class CouponsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const code = data.code.toUpperCase();
        const exists = await this.prisma.coupon.findUnique({ where: { code } });
        if (exists)
            throw new common_1.ConflictException('Coupon code exists');
        return this.prisma.coupon.create({
            data: {
                code,
                description: data.description,
                type: data.type,
                value: data.value,
                minOrderAmount: data.minOrderAmount,
                maxDiscount: data.maxDiscount,
                usageLimit: data.usageLimit,
                perUserLimit: data.perUserLimit ?? 1,
                startsAt: new Date(data.startsAt),
                expiresAt: new Date(data.expiresAt),
            },
        });
    }
    async list(page = 1, limit = 20) {
        const { skip, take } = (0, pagination_dto_1.paginate)(page, limit);
        const [data, total] = await Promise.all([
            this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
            this.prisma.coupon.count(),
        ]);
        return { data, meta: (0, pagination_dto_1.paginationMeta)(total, page, limit) };
    }
    async validate(code, subtotal) {
        const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon || !coupon.isActive)
            throw new common_1.NotFoundException('Invalid coupon');
        if (coupon.expiresAt < new Date() || coupon.startsAt > new Date()) {
            throw new common_1.NotFoundException('Coupon expired or not started');
        }
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new common_1.NotFoundException('Coupon exhausted');
        }
        if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
            throw new common_1.NotFoundException(`Minimum order ₹${coupon.minOrderAmount}`);
        }
        let discount = 0;
        if (coupon.type === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscount)
                discount = Math.min(discount, Number(coupon.maxDiscount));
        }
        else if (coupon.type === 'FIXED') {
            discount = Math.min(Number(coupon.value), subtotal);
        }
        return { coupon, discount: Math.round(discount * 100) / 100 };
    }
    async update(id, data) {
        return this.prisma.coupon.update({ where: { id }, data });
    }
    async remove(id) {
        await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
        return { message: 'Coupon deactivated' };
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
//# sourceMappingURL=coupons.service.js.map