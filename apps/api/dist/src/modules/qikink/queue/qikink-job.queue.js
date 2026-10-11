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
var QikinkJobQueue_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikinkJobQueue = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
let QikinkJobQueue = QikinkJobQueue_1 = class QikinkJobQueue {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(QikinkJobQueue_1.name);
        this.workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    }
    maxAttempts() {
        return this.config.get('qikink.maxAttempts') || 8;
    }
    async enqueue(type, opts = {}) {
        if (opts.orderId && type === client_1.QikinkJobType.SUBMIT_ORDER) {
            const existing = await this.prisma.qikinkJob.findFirst({
                where: {
                    orderId: opts.orderId,
                    type,
                    status: { in: [client_1.QikinkJobStatus.PENDING, client_1.QikinkJobStatus.PROCESSING] },
                },
            });
            if (existing)
                return existing;
        }
        return this.prisma.qikinkJob.create({
            data: {
                type,
                orderId: opts.orderId,
                payload: opts.payload,
                runAfter: opts.runAfter || new Date(),
                maxAttempts: opts.maxAttempts || this.maxAttempts(),
                status: client_1.QikinkJobStatus.PENDING,
            },
        });
    }
    async claimNext(types) {
        const now = new Date();
        return this.prisma.$transaction(async (tx) => {
            const job = await tx.qikinkJob.findFirst({
                where: {
                    status: client_1.QikinkJobStatus.PENDING,
                    runAfter: { lte: now },
                    ...(types?.length ? { type: { in: types } } : {}),
                },
                orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
            });
            if (!job)
                return null;
            const updated = await tx.qikinkJob.updateMany({
                where: { id: job.id, status: client_1.QikinkJobStatus.PENDING },
                data: {
                    status: client_1.QikinkJobStatus.PROCESSING,
                    lockedAt: now,
                    lockedBy: this.workerId,
                    attempts: { increment: 1 },
                },
            });
            if (!updated.count)
                return null;
            return tx.qikinkJob.findUnique({ where: { id: job.id } });
        });
    }
    async complete(jobId, result) {
        return this.prisma.qikinkJob.update({
            where: { id: jobId },
            data: {
                status: client_1.QikinkJobStatus.COMPLETED,
                result,
                completedAt: new Date(),
                lockedAt: null,
                lockedBy: null,
                error: null,
            },
        });
    }
    async fail(jobId, error, attempts, maxAttempts) {
        const delayMs = Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 8) * 15_000);
        const dead = attempts >= maxAttempts;
        return this.prisma.qikinkJob.update({
            where: { id: jobId },
            data: {
                status: dead ? client_1.QikinkJobStatus.DEAD : client_1.QikinkJobStatus.PENDING,
                error,
                runAfter: dead ? undefined : new Date(Date.now() + delayMs),
                lockedAt: null,
                lockedBy: null,
                ...(dead ? { completedAt: new Date() } : {}),
            },
        });
    }
    async requeueDead(orderId) {
        return this.prisma.qikinkJob.updateMany({
            where: { orderId, status: client_1.QikinkJobStatus.DEAD, type: client_1.QikinkJobType.SUBMIT_ORDER },
            data: {
                status: client_1.QikinkJobStatus.PENDING,
                runAfter: new Date(),
                attempts: 0,
                error: null,
                completedAt: null,
            },
        });
    }
};
exports.QikinkJobQueue = QikinkJobQueue;
exports.QikinkJobQueue = QikinkJobQueue = QikinkJobQueue_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], QikinkJobQueue);
//# sourceMappingURL=qikink-job.queue.js.map