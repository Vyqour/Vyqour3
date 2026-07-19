import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { QikinkJobType } from '@prisma/client';
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
          this.logger.warn(`Job ${job.id} failed: ${message}`);
          await this.queue.fail(job.id, message, job.attempts, job.maxAttempts);
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
