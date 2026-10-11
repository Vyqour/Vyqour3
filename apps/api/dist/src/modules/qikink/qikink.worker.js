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
var QikinkWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikinkWorker = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const qikink_job_queue_1 = require("./queue/qikink-job.queue");
const qikink_service_1 = require("./qikink.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let QikinkWorker = QikinkWorker_1 = class QikinkWorker {
    constructor(config, queue, qikink, prisma) {
        this.config = config;
        this.queue = queue;
        this.qikink = qikink;
        this.prisma = prisma;
        this.logger = new common_1.Logger(QikinkWorker_1.name);
        this.timer = null;
        this.running = false;
    }
    onModuleInit() {
        if (!this.qikink.isEnabled()) {
            this.logger.log('Qikink disabled — worker not started');
            return;
        }
        const ms = this.config.get('qikink.workerIntervalMs') || 15_000;
        this.timer = setInterval(() => {
            this.tick().catch((err) => this.logger.error(err));
        }, ms);
        setTimeout(() => this.tick().catch(() => undefined), 3000);
        this.logger.log(`Qikink worker started (interval ${ms}ms)`);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            for (let i = 0; i < 5; i++) {
                const job = await this.queue.claimNext();
                if (!job)
                    break;
                try {
                    let result = null;
                    if (job.type === client_1.QikinkJobType.SUBMIT_ORDER && job.orderId) {
                        result = await this.qikink.processSubmitJob(job.orderId);
                    }
                    else if (job.type === client_1.QikinkJobType.SYNC_ORDER_STATUS && job.orderId) {
                        result = await this.qikink.processStatusSync(job.orderId);
                    }
                    else if (job.type === client_1.QikinkJobType.SYNC_PRODUCTS) {
                        result = await this.qikink.syncProducts();
                    }
                    else if (job.type === client_1.QikinkJobType.RETRY_FAILED && job.orderId) {
                        result = await this.qikink.adminRetry(job.orderId);
                    }
                    else {
                        result = { skipped: true };
                    }
                    await this.queue.complete(job.id, result);
                }
                catch (err) {
                    const message = err.message;
                    this.logger.warn(`Job ${job.id} failed: ${message}`);
                    await this.queue.fail(job.id, message, job.attempts, job.maxAttempts);
                }
            }
        }
        finally {
            this.running = false;
        }
    }
    async pollOpenOrders() {
        if (!this.qikink.isEnabled())
            return;
        if (!this.config.get('qikink.statusPollEnabled'))
            return;
        const orders = await this.prisma.order.findMany({
            where: {
                qikinkOrderId: { not: null },
                status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
            },
            select: { id: true },
            take: 40,
            orderBy: { updatedAt: 'asc' },
        });
        for (const o of orders) {
            await this.queue.enqueue(client_1.QikinkJobType.SYNC_ORDER_STATUS, {
                orderId: o.id,
                runAfter: new Date(),
            });
        }
    }
};
exports.QikinkWorker = QikinkWorker;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QikinkWorker.prototype, "pollOpenOrders", null);
exports.QikinkWorker = QikinkWorker = QikinkWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        qikink_job_queue_1.QikinkJobQueue,
        qikink_service_1.QikinkService,
        prisma_service_1.PrismaService])
], QikinkWorker);
//# sourceMappingURL=qikink.worker.js.map