import { ConfigService } from '@nestjs/config';
import {
  AddressType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  QikinkJobStatus,
  QikinkJobType,
  QikinkSyncStatus,
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

  it('verifies a real PostgreSQL Qikink claim and cancellation race has exactly one winner', async () => {
    const raceOrder = await prisma.order.create({
      data: {
        id: `pg_race_order_${Date.now()}`,
        orderNumber: `PG-RACE-${Date.now()}`,
        userId: testUserId,
        subtotal: 1000,
        total: 1000,
        shippingAddressId: testAddressId,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.CONFIRMED,
      },
    });

    try {
      const [claim, cancel] = await Promise.all([
        prisma.order.updateMany({
          where: {
            id: raceOrder.id,
            status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
            qikinkOrderId: null,
            qikinkSyncStatus: {
              notIn: [
                QikinkSyncStatus.SUBMITTING,
                QikinkSyncStatus.SUBMITTED,
                QikinkSyncStatus.CANCELLED,
              ],
            },
            OR: [
              { paymentMethod: PaymentMethod.COD },
              { paymentStatus: PaymentStatus.PAID },
            ],
          },
          data: { qikinkSyncStatus: QikinkSyncStatus.SUBMITTING },
        }),
        prisma.order.updateMany({
          where: {
            id: raceOrder.id,
            status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
            paymentStatus: { not: PaymentStatus.PAID },
            qikinkOrderId: null,
            qikinkSyncStatus: {
              notIn: [QikinkSyncStatus.SUBMITTING, QikinkSyncStatus.SUBMITTED],
            },
          },
          data: { status: OrderStatus.CANCELLED },
        }),
      ]);

      expect(claim.count + cancel.count).toBe(1);
      const finalOrder = await prisma.order.findUniqueOrThrow({
        where: { id: raceOrder.id },
      });
      if (claim.count === 1) {
        expect(finalOrder.qikinkSyncStatus).toBe(QikinkSyncStatus.SUBMITTING);
        expect(finalOrder.status).toBe(OrderStatus.CONFIRMED);
      } else {
        expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
      }
    } finally {
      await prisma.order.delete({ where: { id: raceOrder.id } });
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
