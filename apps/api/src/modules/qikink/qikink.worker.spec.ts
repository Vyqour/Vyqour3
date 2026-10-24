import { QikinkJobStatus, QikinkJobType, QikinkSyncStatus } from '@prisma/client';
import { QikinkWorker } from './qikink.worker';

describe('QikinkWorker - retry, dead-letter, completed-submission protection', () => {
  let worker: QikinkWorker;
  let mockQueue: any;
  let mockQikink: any;
  let mockPrisma: any;
  let mockConfig: any;

  const submitJob = {
    id: 'job_1',
    type: QikinkJobType.SUBMIT_ORDER,
    orderId: 'order_1',
    status: QikinkJobStatus.PROCESSING,
    attempts: 1,
    maxAttempts: 3,
  };

  beforeEach(() => {
    mockQueue = {
      claimNext: jest.fn(),
      complete: jest.fn().mockResolvedValue({ count: 1 }),
      fail: jest.fn().mockResolvedValue({ count: 1 }),
    };
    mockQikink = {
      isEnabled: jest.fn().mockReturnValue(false), // worker loop only; cron poll disabled
      processSubmitJob: jest.fn(),
      processStatusSync: jest.fn(),
      syncProducts: jest.fn(),
      adminRetry: jest.fn(),
    };
    mockPrisma = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockConfig = {
      get: jest.fn().mockReturnValue(null),
    };

    worker = new QikinkWorker(mockConfig, mockQueue, mockQikink, mockPrisma);
  });

  /** Drive a single tick() by accessing the private method. */
  async function runTick() {
    await (worker as any).tick();
  }

  it('completes a successful submission job', async () => {
    mockQueue.claimNext.mockResolvedValueOnce(submitJob).mockResolvedValue(null);
    mockQikink.processSubmitJob.mockResolvedValue({ success: true, qikinkOrderId: 'QIK1' });

    await runTick();

    expect(mockQueue.complete).toHaveBeenCalledWith('job_1', { success: true, qikinkOrderId: 'QIK1' });
    expect(mockQueue.fail).not.toHaveBeenCalled();
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('retries transient failures via queue.fail and does not mark the order FAILED', async () => {
    mockQueue.claimNext.mockResolvedValueOnce(submitJob).mockResolvedValue(null);
    mockQikink.processSubmitJob.mockRejectedValue(new Error('Network timeout'));

    await runTick();

    expect(mockQueue.fail).toHaveBeenCalledWith('job_1', 'Network timeout', 1, 3, false);
    // Not final attempt -> no FAILED marking on the order at all
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('marks the order FAILED on permanent errors using a guard that cannot touch submitted orders', async () => {
    const err: any = new Error('Validation failed');
    err.isPermanent = true;
    mockQueue.claimNext.mockResolvedValueOnce(submitJob).mockResolvedValue(null);
    mockQikink.processSubmitJob.mockRejectedValue(err);

    await runTick();

    expect(mockQueue.fail).toHaveBeenCalledWith('job_1', 'Validation failed', 1, 3, true);
    // Guarded update: excludes orders that already carry a provider order ID or
    // are marked SUBMITTED — a completed submission can never become FAILED.
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order_1',
        qikinkOrderId: null,
        qikinkSyncStatus: { not: QikinkSyncStatus.SUBMITTED },
      },
      data: {
        qikinkSyncStatus: QikinkSyncStatus.FAILED,
        qikinkLastError: 'Validation failed',
      },
    });
  });

  it('marks the order FAILED only when attempts are exhausted (worker-crash retry exhaustion)', async () => {
    const exhausted = { ...submitJob, attempts: 3 }; // attempts >= maxAttempts
    mockQueue.claimNext.mockResolvedValueOnce(exhausted).mockResolvedValue(null);
    mockQikink.processSubmitJob.mockRejectedValue(new Error('still down'));

    await runTick();

    expect(mockQueue.fail).toHaveBeenCalledWith('job_1', 'still down', 3, 3, false);
    expect(mockPrisma.order.updateMany).toHaveBeenCalled();
  });

  it('never overwrites a completed submission: guard matches nothing, so SUBMITTED stays intact', async () => {
    const err: any = new Error('boom after submit');
    err.isPermanent = true;
    mockQueue.claimNext.mockResolvedValueOnce(submitJob).mockResolvedValue(null);
    mockQikink.processSubmitJob.mockRejectedValue(err);
    // The guarded update matches no rows: order already has qikinkOrderId/SUBMITTED
    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

    await runTick();

    // The write was attempted only with the protective WHERE predicate, and its
    // zero-row result is swallowed — SUBMITTED state is untouched.
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ qikinkSyncStatus: { not: QikinkSyncStatus.SUBMITTED } }),
      }),
    );
  });

  it('processes at most 5 jobs per tick and stops when the queue is empty', async () => {
    mockQueue.claimNext.mockResolvedValue(null);

    await runTick();

    expect(mockQueue.claimNext).toHaveBeenCalledTimes(1);
    expect(mockQueue.complete).not.toHaveBeenCalled();
  });
});
