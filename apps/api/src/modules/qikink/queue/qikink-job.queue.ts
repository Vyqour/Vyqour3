import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QikinkJobStatus, QikinkJobType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class QikinkJobQueue {
  private readonly logger = new Logger(QikinkJobQueue.name);
  private readonly workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  maxAttempts() {
    return this.config.get<number>('qikink.maxAttempts') || 8;
  }

  async enqueue(
    type: QikinkJobType,
    opts: {
      orderId?: string;
      payload?: Prisma.InputJsonValue;
      runAfter?: Date;
      maxAttempts?: number;
    } = {},
  ) {
    // Idempotent enqueue for submit jobs on same order while pending/processing
    if (opts.orderId && type === QikinkJobType.SUBMIT_ORDER) {
      const existing = await this.prisma.qikinkJob.findFirst({
        where: {
          orderId: opts.orderId,
          type,
          status: { in: [QikinkJobStatus.PENDING, QikinkJobStatus.PROCESSING] },
        },
      });
      if (existing) return existing;
    }

    return this.prisma.qikinkJob.create({
      data: {
        type,
        orderId: opts.orderId,
        payload: opts.payload,
        runAfter: opts.runAfter || new Date(),
        maxAttempts: opts.maxAttempts || this.maxAttempts(),
        status: QikinkJobStatus.PENDING,
      },
    });
  }

  async claimNext(types?: QikinkJobType[]) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.qikinkJob.findFirst({
        where: {
          status: QikinkJobStatus.PENDING,
          runAfter: { lte: now },
          ...(types?.length ? { type: { in: types } } : {}),
        },
        orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
      });
      if (!job) return null;
      const updated = await tx.qikinkJob.updateMany({
        where: { id: job.id, status: QikinkJobStatus.PENDING },
        data: {
          status: QikinkJobStatus.PROCESSING,
          lockedAt: now,
          lockedBy: this.workerId,
          attempts: { increment: 1 },
        },
      });
      if (!updated.count) return null;
      return tx.qikinkJob.findUnique({ where: { id: job.id } });
    });
  }

  async complete(jobId: string, result?: Prisma.InputJsonValue) {
    return this.prisma.qikinkJob.update({
      where: { id: jobId },
      data: {
        status: QikinkJobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        error: null,
      },
    });
  }

  async fail(jobId: string, error: string, attempts: number, maxAttempts: number) {
    const delayMs = Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 8) * 15_000);
    const dead = attempts >= maxAttempts;
    return this.prisma.qikinkJob.update({
      where: { id: jobId },
      data: {
        status: dead ? QikinkJobStatus.DEAD : QikinkJobStatus.PENDING,
        error,
        runAfter: dead ? undefined : new Date(Date.now() + delayMs),
        lockedAt: null,
        lockedBy: null,
        ...(dead ? { completedAt: new Date() } : {}),
      },
    });
  }

  async requeueDead(orderId: string) {
    return this.prisma.qikinkJob.updateMany({
      where: { orderId, status: QikinkJobStatus.DEAD, type: QikinkJobType.SUBMIT_ORDER },
      data: {
        status: QikinkJobStatus.PENDING,
        runAfter: new Date(),
        attempts: 0,
        error: null,
        completedAt: null,
      },
    });
  }
}
