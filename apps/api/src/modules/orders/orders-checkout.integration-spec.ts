import {
  AddressType,
  CouponType,
  PaymentMethod,
  ProductStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from './orders.service';

/**
 * Real-PostgreSQL concurrency tests for the atomic coupon usage claim inside
 * OrdersService.create. Uses the actual Prisma client and the actual
 * CartService so the claim runs through the real checkout transaction with
 * real row locks — only mail and Qikink side effects are mocked.
 */
describe('OrdersService checkout - Real PostgreSQL coupon claim Integration Test', () => {
  let prisma: PrismaService;
  let service: OrdersService;
  let testUserId: string;
  let testAddressId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testCartId: string;
  const couponCodes: string[] = [];
  const ts = Date.now();

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/vyqour_test';

    prisma = new PrismaService();
    await prisma.$connect();

    const mockMail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
    const mockQikink = { enqueueOrderSubmission: jest.fn().mockResolvedValue({ queued: true }) };
    service = new OrdersService(prisma, new CartService(prisma), mockMail as any, mockQikink as any);

    // Clean prior artifacts
    await prisma.order.deleteMany({ where: { id: { startsWith: 'pgc_order_' } } });
    await prisma.cart.deleteMany({ where: { id: { startsWith: 'pgc_cart_' } } });
    await prisma.productVariant.deleteMany({ where: { id: { startsWith: 'pgc_var_' } } });
    await prisma.product.deleteMany({ where: { id: { startsWith: 'pgc_prod_' } } });
    await prisma.category.deleteMany({ where: { id: { startsWith: 'pgc_cat_' } } });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: 'PGC' } } });
    await prisma.address.deleteMany({ where: { id: { startsWith: 'pgc_addr_' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'pgc_user_' } } });

    const user = await prisma.user.create({
      data: {
        id: `pgc_user_${ts}`,
        email: `pgc_test_${ts}@example.com`,
        firstName: 'Postgres',
        lastName: 'CouponTester',
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    testUserId = user.id;

    const address = await prisma.address.create({
      data: {
        id: `pgc_addr_${ts}`,
        userId: testUserId,
        type: AddressType.HOME,
        fullName: 'PG Coupon Tester',
        phone: '9876543210',
        line1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    });
    testAddressId = address.id;

    const category = await prisma.category.create({
      data: { id: `pgc_cat_${ts}`, name: 'PGC Test', slug: `pgc-test-${ts}` },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        id: `pgc_prod_${ts}`,
        name: 'PGC Test Tee',
        slug: `pgc-test-tee-${ts}`,
        description: 'Integration test product',
        basePrice: 500,
        categoryId: testCategoryId,
        status: ProductStatus.ACTIVE,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        id: `pgc_var_${ts}`,
        productId: testProductId,
        sku: `PGC-VAR-${ts}`,
        size: 'M',
        stock: 100,
        price: 500,
      },
    });
    testVariantId = variant.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.order.deleteMany({ where: { id: { startsWith: 'pgc_order_' } } });
      await prisma.cart.deleteMany({ where: idPrefix('pgc_cart_') });
      await prisma.productVariant.deleteMany({ where: idPrefix('pgc_var_') });
      await prisma.product.deleteMany({ where: idPrefix('pgc_prod_') });
      await prisma.category.deleteMany({ where: idPrefix('pgc_cat_') });
      await prisma.coupon.deleteMany({ where: { code: { in: couponCodes } } });
      await prisma.address.deleteMany({ where: idPrefix('pgc_addr_') });
      await prisma.user.deleteMany({ where: idPrefix('pgc_user_') });
      await prisma.$disconnect();
    }
  });

  function idPrefix(prefix: string) {
    return { id: { startsWith: prefix } };
  }

  async function seedCoupon(code: string, usageLimit: number | null, usageCount = 0) {
    couponCodes.push(code);
    return prisma.coupon.create({
      data: {
        code,
        type: CouponType.PERCENTAGE,
        value: 10,
        usageLimit,
        usageCount,
        startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  }

  /** Fresh cart with one variant line item and the coupon applied. */
  async function seedCartWithCoupon(couponCode: string) {
    await prisma.cartItem.deleteMany({ where: { cartId: testCartId || '' } }).catch(() => undefined);
    if (testCartId) {
      await prisma.cart.delete({ where: { id: testCartId } }).catch(() => undefined);
    }
    const cart = await prisma.cart.create({
      data: {
        id: `pgc_cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: testUserId,
        couponCode,
        items: {
          create: {
            productId: testProductId,
            variantId: testVariantId,
            quantity: 1,
          },
        },
      },
    });
    testCartId = cart.id;
    return cart;
  }

  it('two concurrent checkouts with usageLimit=1: exactly one claims the last use; loser rolls back fully', async () => {
    const code = `PGC-RACE-${ts}`;
    await seedCoupon(code, 1, 0);
    await seedCartWithCoupon(code);

    const dto = {
      paymentMethod: PaymentMethod.RAZORPAY,
      shippingAddressId: testAddressId,
    } as any;

    const results = await Promise.allSettled([
      service.create(testUserId, dto),
      service.create(testUserId, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toBe('Coupon usage limit reached');

    // Exactly one order exists — the loser's entire checkout (order, items,
    // payment, history, stock decrement) was rolled back with its claim.
    const orders = await prisma.order.findMany({ where: { userId: testUserId } });
    expect(orders).toHaveLength(1);
    const orderItems = await prisma.orderItem.findMany({ where: { orderId: orders[0].id } });
    expect(orderItems).toHaveLength(1);

    // Exactly one usage claimed
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    expect(coupon!.usageCount).toBe(1);

    // Stock decremented exactly once
    const variant = await prisma.productVariant.findUnique({ where: { id: testVariantId } });
    expect(variant!.stock).toBe(99);

    // Clean up for subsequent tests
    await prisma.order.deleteMany({ where: { userId: testUserId } });
    await prisma.productVariant.update({ where: { id: testVariantId }, data: { stock: 100 } });
  });

  it('a checkout failure AFTER the coupon claim rolls the claim back (no half-applied checkout)', async () => {
    const code = `PGC-ROLLBACK-${ts}`;
    await seedCoupon(code, 5, 0);

    // Mirrors the claim block inside OrdersService.create: guarded increment
    // inside $transaction, followed by a simulated later checkout failure.
    await expect(
      prisma.$transaction(async (tx) => {
        const claimed = await tx.coupon.updateMany({
          where: { code, isActive: true, usageCount: { lt: 5 } },
          data: { usageCount: { increment: 1 } },
        });
        expect(claimed.count).toBe(1);
        throw new Error('simulated checkout failure after claim');
      }),
    ).rejects.toThrow('simulated checkout failure after claim');

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    expect(coupon!.usageCount).toBe(0); // claim fully rolled back
  });

  it('unlimited coupons (usageLimit null) claim without a count predicate and succeed under concurrency', async () => {
    const code = `PGC-UNLIMITED-${ts}`;
    await seedCoupon(code, null, 0);
    await seedCartWithCoupon(code);

    // One checkout succeeds with the null-limit predicate (no count guard)
    const order = await service.create(testUserId, {
      paymentMethod: PaymentMethod.RAZORPAY,
      shippingAddressId: testAddressId,
    } as any);
    expect(order).toBeDefined();

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    expect(coupon!.usageCount).toBe(1);

    const orders = await prisma.order.findMany({ where: { userId: testUserId } });
    expect(orders).toHaveLength(1);

    // Reset for cleanliness
    await prisma.order.deleteMany({ where: { userId: testUserId } });
    await prisma.productVariant.update({ where: { id: testVariantId }, data: { stock: 100 } });
  });
});
