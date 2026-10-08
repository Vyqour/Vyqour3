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
exports.QikinkController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const qikink_service_1 = require("./qikink.service");
const qikink_job_queue_1 = require("./queue/qikink-job.queue");
const client_2 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const qikink_dto_1 = require("./dto/qikink.dto");
let QikinkController = class QikinkController {
    constructor(qikink, queue, prisma) {
        this.qikink = qikink;
        this.queue = queue;
        this.prisma = prisma;
    }
    async webhook(headers, body, req) {
        return this.qikink.handleWebhook(headers, req.rawBody, body);
    }
    health() {
        return {
            enabled: this.qikink.isEnabled(),
            autoSubmit: this.qikink.autoSubmitEnabled(),
        };
    }
    submit(orderId) {
        return this.qikink.enqueueOrderSubmission(orderId, 'admin_manual');
    }
    retry(orderId) {
        return this.qikink.adminRetry(orderId);
    }
    fulfillment(orderId) {
        return this.qikink.getOrderFulfillment(orderId);
    }
    async syncStatus(orderId) {
        const job = await this.queue.enqueue(client_2.QikinkJobType.SYNC_ORDER_STATUS, { orderId });
        return { queued: true, jobId: job.id };
    }
    async syncProducts() {
        const job = await this.queue.enqueue(client_2.QikinkJobType.SYNC_PRODUCTS, {});
        const result = await this.qikink.syncProducts();
        return { jobId: job.id, result };
    }
    catalog() {
        return this.prisma.qikinkProductCatalog.findMany({
            orderBy: { lastSyncedAt: 'desc' },
            take: 200,
        });
    }
    logs() {
        return this.prisma.qikinkApiLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    jobs() {
        return this.prisma.qikinkJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    mapProduct(productId, dto) {
        return this.prisma.product.update({
            where: { id: productId },
            data: {
                qikinkSku: dto.qikinkSku,
                qikinkPrintTypeId: dto.qikinkPrintTypeId,
                qikinkDesignCode: dto.qikinkDesignCode,
                qikinkDesignUrl: dto.qikinkDesignUrl,
                qikinkMockupUrl: dto.qikinkMockupUrl,
                qikinkPlacementSku: dto.qikinkPlacementSku,
                qikinkSearchFromMyProducts: dto.qikinkSearchFromMyProducts,
            },
        });
    }
    mapVariant(variantId, body) {
        return this.prisma.productVariant.update({
            where: { id: variantId },
            data: {
                qikinkSku: body.qikinkSku,
                qikinkPrice: body.qikinkPrice,
            },
        });
    }
};
exports.QikinkController = QikinkController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhooks'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    (0, swagger_1.ApiOperation)({ summary: 'Qikink fulfillment webhook receiver' }),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], QikinkController.prototype, "webhook", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/submit'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN, client_1.Role.SUPPORT),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/retry'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "retry", null);
__decorate([
    (0, common_1.Get)('orders/:orderId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN, client_1.Role.SUPPORT),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "fulfillment", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/sync-status'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN, client_1.Role.SUPPORT),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QikinkController.prototype, "syncStatus", null);
__decorate([
    (0, common_1.Post)('products/sync'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QikinkController.prototype, "syncProducts", null);
__decorate([
    (0, common_1.Get)('products/catalog'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "logs", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "jobs", null);
__decorate([
    (0, common_1.Patch)('products/:productId/mapping'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, qikink_dto_1.MapQikinkSkuDto]),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "mapProduct", null);
__decorate([
    (0, common_1.Patch)('variants/:variantId/mapping'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('variantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QikinkController.prototype, "mapVariant", null);
exports.QikinkController = QikinkController = __decorate([
    (0, swagger_1.ApiTags)('qikink'),
    (0, common_1.Controller)('qikink'),
    __metadata("design:paramtypes", [qikink_service_1.QikinkService,
        qikink_job_queue_1.QikinkJobQueue,
        prisma_service_1.PrismaService])
], QikinkController);
//# sourceMappingURL=qikink.controller.js.map