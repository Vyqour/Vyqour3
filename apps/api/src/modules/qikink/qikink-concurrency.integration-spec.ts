import { ConfigService } from '@nestjs/config';
import {
  AddressType,
  PaymentMethod,
  PaymentStatus,
  QikinkJobStatus,
  QikinkJobType,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QikinkJobQueue } from './queue/qikink-job.queue';

describe('QikinkJobQueue Real PostgreSQL Concurrency Integration Test', () => {
  let prisma: PrismaService;
  let queue: QikinkJobQueue;
  let testUserId: string;
  let testAddressId: string;
  let testOrderId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/vyqour_test';

    prisma = new PrismaService();
    await prisma.$connect();

    const config = new ConfigService({
      qikink: { maxAttempts: 8 },
    });
    queue = new QikinkJobQueue(prisma, config);

    // Clean any prior test artifacts
    await prisma.qikinkJob.deleteMany({ where: { orderId: { startsWith: 'pg_order_' } } });
    await prisma.order.deleteMany({ where: { id: { startsWith: 'pg_order_' } } });
    await prisma.address.deleteMany({ where: { id: { startsWith: 'pg_addr_' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'pg_user_' } } });

    // Seed required database records in PostgreSQL
    const user = await prisma.user.create({
      data: {
        id: `pg_user_${Date.now()}`,
        email: `pg_test_${Date.now()}@example.com`,
        firstName: 'Postgres',
        lastName: 'Tester',
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    testUserId = user.id;

    const address = await prisma.address.create({
      data: {
        id: `pg_addr_${Date.now()}`,
        userId: testUserId,
        type: AddressType.HOME,
        fullName: 'Postgres Tester',
        phone: '9876543210',
        line1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    });
    testAddressId = address.id;

    const order = await prisma.order.create({
      data: {
        id: `pg_order_${Date.now()}`,
        orderNumber: `PG-ORD-${Date.now()}`,
        userId: testUserId,
        subtotal: 1000,
        total: 1000,
        shippingAddressId: testAddressId,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PAID,
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    if (prisma) {
      if (testOrderId) {
        await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
        await prisma.order.deleteMany({ where: { id: testOrderId } });
      }
      if (testAddressId) {
        await prisma.address.deleteMany({ where: { id: testAddressId } });
      }
      if (testUserId) {
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      await prisma.$disconnect();
    }
  });

  it('verifies two simultaneous enqueue calls on real PostgreSQL create exactly ONE SUBMIT_ORDER job', async () => {
    // Fire two truly concurrent enqueue calls against real PostgreSQL
    const [job1, job2] = await Promise.all([
      queue.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId }),
      queue.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId }),
    ]);

    // Query real PostgreSQL database to check jobs created for this orderId
    const activeJobsInDb = await prisma.qikinkJob.findMany({
      where: {
        orderId: testOrderId,
        type: QikinkJobType.SUBMIT_ORDER,
        status: { in: [QikinkJobStatus.PENDING, QikinkJobStatus.PROCESSING] },
      },
    });

    // Verify assertions
    expect(activeJobsInDb).toHaveLength(1);
    expect(job1.id).toBe(job2.id);
    expect(job1.id).toBe(activeJobsInDb[0].id);
    expect(activeJobsInDb[0].status).toBe(QikinkJobStatus.PENDING);
  });
});

describe('QikinkJobQueue Real PostgreSQL claim/ownership/crash-recovery Integration Test', () => {
  let prisma: PrismaService;
  let workerA: QikinkJobQueue;
  let workerB: QikinkJobQueue;
  let testOrderId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/vyqour_test';

    prisma = new PrismaService();
    await prisma.$connect();

    // 60s lock timeout so tests can age locks without waiting the full 10 minutes
    const config = new ConfigService({
      qikink: { maxAttempts: 3, jobLockTimeoutMs: 60_000 },
    });
    workerA = new QikinkJobQueue(prisma, config);
    workerB = new QikinkJobQueue(prisma, config);

    // Clean prior artifacts from both describes
    await prisma.qikinkJob.deleteMany({ where: { orderId: { startsWith: 'pgq_order_' } } });
    await prisma.order.deleteMany({ where: { id: { startsWith: 'pgq_order_' } } });
    await prisma.address.deleteMany({ where: { id: { startsWith: 'pgq_addr_' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'pgq_user_' } } });

    const ts = Date.now();
    const user = await prisma.user.create({
      data: {
        id: `pgq_user_${ts}`,
        email: `pgq_test_${ts}@example.com`,
        firstName: 'Postgres',
        lastName: 'QueueTester',
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    const address = await prisma.address.create({
      data: {
        id: `pgq_addr_${ts}`,
        userId: user.id,
        type: AddressType.HOME,
        fullName: 'PG Queue Tester',
        phone: '9876543210',
        line1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    });
    const order = await prisma.order.create({
      data: {
        id: `pgq_order_${ts}`,
        orderNumber: `PGQ-ORD-${ts}`,
        userId: user.id,
        subtotal: 1000,
        total: 1000,
        shippingAddressId: address.id,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PAID,
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
      await prisma.address.deleteMany({ where: { id: { startsWith: 'pgq_addr_' } } });
      await prisma.user.deleteMany({ where: { id: { startsWith: 'pgq_user_' } } });
      await prisma.$disconnect();
    }
  });

  it('two concurrent claimNext calls: exactly one worker owns the job', async () => {
    await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
    const job = await workerA.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId });

    const [claimA, claimB] = await Promise.all([workerA.claimNext(), workerB.claimNext()]);

    const winners = [claimA, claimB].filter(Boolean);
    expect(winners).toHaveLength(1);
    expect(winners[0]!.id).toBe(job.id);

    const row = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(row!.status).toBe(QikinkJobStatus.PROCESSING);
    expect(row!.attempts).toBe(1);
    expect(row!.lockedBy).toBe(winners[0]!.lockedBy);
    expect(row!.lockedAt).not.toBeNull();
  });

  it('a stale worker cannot complete or fail a job owned by another worker (ownership guard)', async () => {
    await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
    const job = await workerA.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId });

    const claimedByA = await workerA.claimNext();
    expect(claimedByA?.id).toBe(job.id);

    // Worker B reports completion/failure for a job it does not own: both ignored
    const foreignComplete = await workerB.complete(job.id, { hijacked: true });
    const foreignFail = await workerB.fail(job.id, 'stale report', 1, 3, false);
    expect(foreignComplete.count).toBe(0);
    expect(foreignFail.count).toBe(0);

    const stillOwned = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(stillOwned!.status).toBe(QikinkJobStatus.PROCESSING);
    expect(stillOwned!.lockedBy).toBe(claimedByA!.lockedBy);
    expect(stillOwned!.result).toBeNull();

    // The true owner resolves it normally
    const owned = await workerA.complete(job.id, { ok: true });
    expect(owned.count).toBe(1);
    const done = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(done!.status).toBe(QikinkJobStatus.COMPLETED);
  });

  it('worker-crash recovery: stale lock reclaimed, dead worker\'s late completion ignored', async () => {
    await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
    const job = await workerA.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId });

    await workerA.claimNext();
    const crashedOwner = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(crashedOwner!.lockedBy).toBeTruthy();

    // Crash: A's lock ages past the 60s timeout without resolution
    await prisma.qikinkJob.update({
      where: { id: job.id },
      data: { lockedAt: new Date(Date.now() - 5 * 60 * 1000) },
    });

    // Worker B reclaims the abandoned job and becomes its new owner
    const reclaimed = await workerB.claimNext();
    expect(reclaimed?.id).toBe(job.id);
    expect(reclaimed?.status).toBe(QikinkJobStatus.PROCESSING);
    expect(reclaimed?.attempts).toBe(2); // incremented on re-claim
    expect(reclaimed?.lockedBy).not.toBe(crashedOwner!.lockedBy);

    // The dead worker's late completion cannot clobber the new owner's state
    const lateComplete = await workerA.complete(job.id, { zombie: true });
    expect(lateComplete.count).toBe(0);

    const ownedByB = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(ownedByB!.status).toBe(QikinkJobStatus.PROCESSING);
    expect(ownedByB!.result).toBeNull();

    // New owner resolves the recovered job normally
    const resolved = await workerB.complete(job.id, { recovered: true });
    expect(resolved.count).toBe(1);
    const final = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(final!.status).toBe(QikinkJobStatus.COMPLETED);
  });

  it('a live worker\'s fresh in-flight job is NOT reclaimed before the lock timeout', async () => {
    await prisma.qikinkJob.deleteMany({ where: { orderId: testOrderId } });
    const job = await workerA.enqueue(QikinkJobType.SUBMIT_ORDER, { orderId: testOrderId });
    await workerA.claimNext();

    // Worker B has nothing claimable and must not steal A's fresh lock
    const stolen = await workerB.claimNext();
    expect(stolen).toBeNull();

    const row = await prisma.qikinkJob.findUnique({ where: { id: job.id } });
    expect(row!.status).toBe(QikinkJobStatus.PROCESSING);
    expect(row!.lockedBy).toBeTruthy();
  });
});
