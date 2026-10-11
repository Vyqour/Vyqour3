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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async dashboard() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [totalOrders, ordersToday, ordersMonth, revenueAgg, revenueMonthAgg, customers, products, lowStock, recentOrders, statusBreakdown,] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
            this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
            this.prisma.order.aggregate({
                where: { paymentStatus: { in: [client_1.PaymentStatus.PAID, client_1.PaymentStatus.PENDING] }, status: { not: client_1.OrderStatus.CANCELLED } },
                _sum: { total: true },
            }),
            this.prisma.order.aggregate({
                where: {
                    createdAt: { gte: startOfMonth },
                    status: { not: client_1.OrderStatus.CANCELLED },
                },
                _sum: { total: true },
            }),
            this.prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
            this.prisma.product.count({ where: { status: 'ACTIVE' } }),
            this.prisma.productVariant.count({ where: { stock: { lte: 5 }, isActive: true } }),
            this.prisma.order.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { firstName: true, email: true } },
                    items: true,
                },
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });
        const revenueSeries = await Promise.all(days.map(async (day) => {
            const next = new Date(day);
            next.setDate(next.getDate() + 1);
            const agg = await this.prisma.order.aggregate({
                where: {
                    createdAt: { gte: day, lt: next },
                    status: { not: client_1.OrderStatus.CANCELLED },
                },
                _sum: { total: true },
                _count: true,
            });
            return {
                date: day.toISOString().slice(0, 10),
                revenue: Number(agg._sum.total || 0),
                orders: agg._count,
            };
        }));
        return {
            kpis: {
                totalOrders,
                ordersToday,
                ordersMonth,
                totalRevenue: Number(revenueAgg._sum.total || 0),
                revenueMonth: Number(revenueMonthAgg._sum.total || 0),
                customers,
                activeProducts: products,
                lowStockVariants: lowStock,
            },
            statusBreakdown: statusBreakdown.map((s) => ({
                status: s.status,
                count: s._count,
            })),
            revenueSeries,
            recentOrders,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map