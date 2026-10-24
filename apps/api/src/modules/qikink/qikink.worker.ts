import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { QikinkJobType, QikinkSyncStatus } from '@prisma/client';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import { QikinkService } from './qikink.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QikinkWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QikinkWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly queue: QikinkJobQueue,
    private readonly qikink: QikinkService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    if (!this.qikink.isEnabled()) {
      this.logger.log('Qikink disabled — worker not started');
      return;
    }
    const ms = this.config.get<number>('qikink.workerIntervalMs') || 15_000;
    this.timer = setInterval(() => {
      this.tick().catch((err) => this.logger.error(err));
    }, ms);
    // kick once
    setTimeout(() => this.tick().catch(() => undefined), 3000);
    this.logger.log(`Qikink worker started (interval ${ms}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      for (let i = 0; i < 5; i++) {
        const job = await this.queue.claimNext();
        if (!job) break;
        try {
          let result: unknown = null;
          if (job.type === QikinkJobType.SUBMIT_ORDER && job.orderId) {
            result = await this.qikink.processSubmitJob(job.orderId);
          } else if (job.type === QikinkJobType.SYNC_ORDER_STATUS && job.orderId) {
            result = await this.qikink.processStatusSync(job.orderId);
          } else if (job.type === QikinkJobType.SYNC_PRODUCTS) {
            result = await this.qikink.syncProducts();
          } else if (job.type === QikinkJobType.RETRY_FAILED && job.orderId) {
            result = await this.qikink.adminRetry(job.orderId);
          } else {
            result = { skipped: true };
          }
          await this.queue.complete(job.id, result as object);
        } catch (err) {
          const message = (err as Error).message;
          const isPermanent = (err as any)?.isPermanent === true;
          this.logger.warn(`Job ${job.id} failed: ${message} (permanent=${isPermanent})`);
          await this.queue.fail(job.id, message, job.attempts, job.maxAttempts, isPermanent);

          if ((isPermanent || job.attempts >= job.maxAttempts) && job.orderId && job.type === QikinkJobType.SUBMIT_ORDER) {
            // Guarded FAILED marking: never overwrite an order whose submission
            // actually completed (provider accepted it) if a later queue step
            // failed — the WHERE clause excludes SUBMITTED orders and orders that
            // already carry a provider order ID.
            await this.prisma.order.updateMany({
              where: {
                id: job.orderId,
                qikinkOrderId: null,
                qikinkSyncStatus: { not: QikinkSyncStatus.SUBMITTED },
              },
              data: {
                qikinkSyncStatus: QikinkSyncStatus.FAILED,
                qikinkLastError: message.slice(0, 1000),
              },
            }).catch(() => undefined);
          }
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Periodic status poll for in-flight Qikink orders */
  @Cron('*/30 * * * *')
  async pollOpenOrders() {
    if (!this.qikink.isEnabled()) return;
    if (!this.config.get<boolean>('qikink.statusPollEnabled')) return;

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
      await this.queue.enqueue(QikinkJobType.SYNC_ORDER_STATUS, {
        orderId: o.id,
        runAfter: new Date(),
      });
    }
  }
}
