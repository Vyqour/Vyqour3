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

  /**
   * Stale-job timeout: a PROCESSING job whose lock is older than this is
   * considered abandoned (its worker crashed or stalled) and may be reclaimed.
   * Default 10 minutes (QIKINK_JOB_LOCK_TIMEOUT_MS).
   */
  jobLockTimeoutMs() {
    return this.config.get<number>('qikink.jobLockTimeoutMs') || 10 * 60 * 1000;
  }

  async enqueue(
    type: QikinkJobType,
    opts: {
      orderId?: string;
      payload?: Prisma.InputJsonValue;
      runAfter?: Date;
      maxAttempts?: number;
    } = {},
    existingTx?: Prisma.TransactionClient,
  ) {
    const runInTx = async (tx: Prisma.TransactionClient) => {
      if (opts.orderId && type === QikinkJobType.SUBMIT_ORDER) {
        // Explicit DB row-level lock on the order row to serialize concurrent enqueue calls
        try {
          await tx.$executeRaw`SELECT id FROM orders WHERE id = ${opts.orderId} FOR UPDATE`;
        } catch {
          // Ignore row lock if DB engine or mock doesn't support raw SQL row locks
        }

        const existing = await tx.qikinkJob.findFirst({
          where: {
            orderId: opts.orderId,
            type,
            status: { in: [QikinkJobStatus.PENDING, QikinkJobStatus.PROCESSING] },
          },
        });
        if (existing) return existing;
      }

      return tx.qikinkJob.create({
        data: {
          type,
          orderId: opts.orderId,
          payload: opts.payload,
          runAfter: opts.runAfter || new Date(),
          maxAttempts: opts.maxAttempts || this.maxAttempts(),
          status: QikinkJobStatus.PENDING,
        },
      });
    };

    if (existingTx) {
      return runInTx(existingTx);
    }

    return this.prisma.$transaction(runInTx);
  }

  async claimNext(types?: QikinkJobType[]) {
    const now = new Date();
    const lockCutoff = new Date(now.getTime() - this.jobLockTimeoutMs());
    // Bounded retries: losing a claim race to another worker should not starve
    // this worker of other available jobs.
    for (let attempt = 0; attempt < 3; attempt++) {
      const job = await this.prisma.$transaction(async (tx) => {
        // Reclaim jobs abandoned by crashed/stalled workers. Guarded by the lock
        // cutoff, so a live worker's in-flight job is never stolen mid-run.
        // Execution remains at-least-once; handlers are protected by their own
        // order-level atomic claims.
        const reclaimed = await tx.qikinkJob.updateMany({
          where: {
            status: QikinkJobStatus.PROCESSING,
            lockedAt: { lt: lockCutoff },
          },
          data: { status: QikinkJobStatus.PENDING, lockedAt: null, lockedBy: null },
        });
        if (reclaimed.count) {
          this.logger.warn(
            `Reclaimed ${reclaimed.count} stale Qikink job(s) abandoned for over ${this.jobLockTimeoutMs()}ms`,
          );
        }

        const candidate = await tx.qikinkJob.findFirst({
          where: {
            status: QikinkJobStatus.PENDING,
            runAfter: { lte: now },
            ...(types?.length ? { type: { in: types } } : {}),
          },
          orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
        });
        if (!candidate) return null;
        // Guarded PENDING → PROCESSING transition: the WHERE clause re-checks the
        // status after the row lock is acquired, so exactly one worker can own the
        // job even when several race for the same candidate.
        const updated = await tx.qikinkJob.updateMany({
          where: { id: candidate.id, status: QikinkJobStatus.PENDING },
          data: {
            status: QikinkJobStatus.PROCESSING,
            lockedAt: now,
            lockedBy: this.workerId,
            attempts: { increment: 1 },
          },
        });
        if (!updated.count) return null;
        return tx.qikinkJob.findUnique({ where: { id: candidate.id } });
      });
      if (job) return job;
      // null can mean "queue empty" or "lost a claim race" — only retry when
      // more claimable jobs exist.
      const remaining = await this.prisma.qikinkJob.count({
        where: {
          status: QikinkJobStatus.PENDING,
          runAfter: { lte: now },
          ...(types?.length ? { type: { in: types } } : {}),
        },
      });
      if (!remaining) return null;
    }
    return null;
  }

  async complete(jobId: string, result?: Prisma.InputJsonValue) {
    // Ownership guard: if this worker stalled and the job was reclaimed, another
    // worker may own it now — a late completion must never clobber that state.
    const res = await this.prisma.qikinkJob.updateMany({
      where: {
        id: jobId,
        status: QikinkJobStatus.PROCESSING,
        lockedBy: this.workerId,
      },
      data: {
        status: QikinkJobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        error: null,
      },
    });
    if (!res.count) {
      this.logger.warn(
        `Job ${jobId} completion ignored: job is no longer owned by ${this.workerId} (reclaimed or already resolved)`,
      );
    }
    return res;
  }

  async fail(
    jobId: string,
    error: string,
    attempts: number,
    maxAttempts: number,
    isPermanent = false,
  ) {
    const delayMs = Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 8) * 15_000);
    const dead = isPermanent || attempts >= maxAttempts;
    // Same ownership guard as complete(): a stale worker's failure report must
    // not reset a job another worker currently owns.
    const res = await this.prisma.qikinkJob.updateMany({
      where: {
        id: jobId,
        status: QikinkJobStatus.PROCESSING,
        lockedBy: this.workerId,
      },
      data: {
        status: dead ? QikinkJobStatus.DEAD : QikinkJobStatus.PENDING,
        error,
        runAfter: dead ? undefined : new Date(Date.now() + delayMs),
        lockedAt: null,
        lockedBy: null,
        ...(dead ? { completedAt: new Date() } : {}),
      },
    });
    if (!res.count) {
      this.logger.warn(
        `Job ${jobId} failure ignored: job is no longer owned by ${this.workerId} (reclaimed or already resolved)`,
      );
    }
    return res;
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
