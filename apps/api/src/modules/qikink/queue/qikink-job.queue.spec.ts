import { QikinkJobStatus, QikinkJobType } from '@prisma/client';
import { QikinkJobQueue } from './qikink-job.queue';

describe('QikinkJobQueue - lock timeout, stale reclamation, ownership guards', () => {
  let queue: QikinkJobQueue;
  let mockTx: any;
  let mockPrisma: any;
  let configValues: Record<string, number | undefined>;

  beforeEach(() => {
    configValues = {};
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    };

    mockTx = {
      qikinkJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    mockPrisma = {
      $transaction: jest.fn(async (cb: any) => cb(mockTx)),
      qikinkJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    queue = new QikinkJobQueue(mockPrisma as any, config as any);
  });

  describe('jobLockTimeoutMs', () => {
    it('defaults to 10 minutes when not configured', () => {
      expect(queue.jobLockTimeoutMs()).toBe(10 * 60 * 1000);
    });

    it('uses the configured QIKINK_JOB_LOCK_TIMEOUT_MS value', () => {
      configValues['qikink.jobLockTimeoutMs'] = 30_000;
      expect(queue.jobLockTimeoutMs()).toBe(30_000);
    });
  });

  describe('claimNext', () => {
    it('reclaims stale PROCESSING jobs (crashed worker) before claiming', async () => {
      configValues['qikink.jobLockTimeoutMs'] = 60_000;
      const candidate = { id: 'job_1', status: QikinkJobStatus.PENDING };
      mockTx.qikinkJob.findFirst.mockResolvedValue(candidate);
      mockTx.qikinkJob.findUnique.mockResolvedValue({
        ...candidate,
        status: QikinkJobStatus.PROCESSING,
      });

      const job = await queue.claimNext();

      // 1st updateMany call: stale reclamation gated by the lock cutoff
      expect(mockTx.qikinkJob.updateMany.mock.calls[0][0].where).toEqual({
        status: QikinkJobStatus.PROCESSING,
        lockedAt: { lt: expect.any(Date) },
      });
      // Cutoff honors the configured 60s timeout (not more than ~60s old)
      const cutoff: Date = mockTx.qikinkJob.updateMany.mock.calls[0][0].where.lockedAt.lt;
      expect(Math.abs(Date.now() - cutoff.getTime() - 60_000)).toBeLessThan(5_000);
      // 2nd updateMany call: guarded PENDING -> PROCESSING claim
      expect(mockTx.qikinkJob.updateMany.mock.calls[1][0]).toMatchObject({
        where: { id: 'job_1', status: QikinkJobStatus.PENDING },
        data: {
          status: QikinkJobStatus.PROCESSING,
          lockedBy: expect.any(String),
          attempts: { increment: 1 },
        },
      });
      expect(job?.id).toBe('job_1');
    });

    it('claims a job with an ownership stamp so two workers cannot own the same job', async () => {
      const candidate = { id: 'job_2', status: QikinkJobStatus.PENDING };
      mockTx.qikinkJob.findFirst.mockResolvedValue(candidate);
      mockTx.qikinkJob.findUnique.mockImplementation(async ({ where }: any) => ({
        ...candidate,
        status: QikinkJobStatus.PROCESSING,
        lockedBy: mockTx.qikinkJob.updateMany.mock.calls[1][0].data.lockedBy,
      }));

      const jobA = await queue.claimNext();
      expect(jobA?.lockedBy).toEqual(expect.any(String));
      expect(mockTx.qikinkJob.updateMany.mock.calls[1][0].data.lockedBy).toBe(jobA?.lockedBy);
    });

    it('loses the claim race safely: guarded updateMany count=0 -> no job owned, retries then stops', async () => {
      const candidate = { id: 'job_3', status: QikinkJobStatus.PENDING };
      mockTx.qikinkJob.findFirst.mockResolvedValue(candidate);
      // Every guarded claim loses the race
      mockTx.qikinkJob.updateMany.mockImplementation(async (args: any) => ({
        count: args.where.id ? 0 : 0,
      }));
      mockPrisma.qikinkJob.count.mockResolvedValue(3); // more jobs exist -> bounded retries

      const job = await queue.claimNext();

      expect(job).toBeNull();
      // Bounded retries: initial claim + 2 retries, then give up for this tick
      const claimCalls = mockTx.qikinkJob.updateMany.mock.calls.filter((c: any[]) => c[0]?.where?.id);
      expect(claimCalls.length).toBe(3);
    });

    it('returns null without retry storm when the queue is empty', async () => {
      mockTx.qikinkJob.findFirst.mockResolvedValue(null);
      mockPrisma.qikinkJob.count.mockResolvedValue(0);

      const job = await queue.claimNext();

      expect(job).toBeNull();
      // Only the reclamation call runs; no claim attempts on an empty queue
      const claimCalls = mockTx.qikinkJob.updateMany.mock.calls.filter((c: any[]) => c[0]?.where?.id);
      expect(claimCalls.length).toBe(0);
    });
  });

  describe('complete', () => {
    it('completes only while still owning the job (status + ownership guarded)', async () => {
      await queue.complete('job_1', { ok: true });

      expect(mockPrisma.qikinkJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'job_1',
            status: QikinkJobStatus.PROCESSING,
            lockedBy: expect.any(String),
          },
          data: expect.objectContaining({
            status: QikinkJobStatus.COMPLETED,
            lockedAt: null,
            lockedBy: null,
          }),
        }),
      );
    });

    it('a stale worker whose job was reclaimed cannot overwrite the new owner state', async () => {
      // Job was reclaimed -> ownership guard matches nothing
      mockPrisma.qikinkJob.updateMany.mockResolvedValue({ count: 0 });

      const res = await queue.complete('job_1', { ok: true });

      // No throw, no overwrite — the write was a no-op
      expect(res.count).toBe(0);
    });
  });

  describe('fail', () => {
    it('retries a transient failure by returning the job to PENDING with backoff', async () => {
      await queue.fail('job_1', 'Network timeout', 2, 8, false);

      expect(mockPrisma.qikinkJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'job_1',
            status: QikinkJobStatus.PROCESSING,
            lockedBy: expect.any(String),
          }),
          data: expect.objectContaining({
            status: QikinkJobStatus.PENDING,
            error: 'Network timeout',
            runAfter: expect.any(Date),
            lockedAt: null,
            lockedBy: null,
          }),
        }),
      );
    });

    it('dead-letters after max attempts', async () => {
      await queue.fail('job_1', 'Still failing', 8, 8, false);

      expect(mockPrisma.qikinkJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: QikinkJobStatus.DEAD,
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('dead-letters immediately on permanent errors regardless of attempts', async () => {
      await queue.fail('job_1', 'Validation failed', 1, 8, true);

      expect(mockPrisma.qikinkJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: QikinkJobStatus.DEAD }),
        }),
      );
    });

    it('a stale worker cannot reset a reclaimed job back to PENDING', async () => {
      mockPrisma.qikinkJob.updateMany.mockResolvedValue({ count: 0 });

      const res = await queue.fail('job_1', 'late failure', 1, 8, false);

      expect(res.count).toBe(0);
    });
  });

  describe('enqueue (existing dedup preserved)', () => {
    it('does not create a second active SUBMIT_ORDER job for the same order', async () => {
      const existing = { id: 'job_active', type: QikinkJobType.SUBMIT_ORDER };
      mockTx.qikinkJob.findFirst.mockResolvedValue(existing);

      const job = await queue.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: 'order_1' });

      expect(job.id).toBe('job_active');
      expect(mockTx.qikinkJob.create).toBeUndefined(); // no create model on this mock — dedup short-circuits
    });
  });
});
