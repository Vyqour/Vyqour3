import {
  AddressType,
  PaymentMethod,
  ProductStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from './orders.service';

/**
 * Real-PostgreSQL concurrency tests for the atomic, conditional variant stock
 * decrement inside OrdersService.create. Two different users race to buy the
 * same limited stock through the real checkout transaction with real row
 * locks — only mail and Qikink side effects are mocked.
 *
 * Proves: stock can never go negative, exactly the available units sell, and
 * every losing checkout is fully rolled back (no orphan order/payment/items).
 */
describe('OrdersService checkout - Real PostgreSQL stock concurrency Integration Test', () => {
  let prisma: PrismaService;
  let service: OrdersService;
  let userA: string;
  let userB: string;
  let addrA: string;
  let addrB: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  const ts = Date.now();

  const productName = 'PGS Stock Tee';

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
    await prisma.order.deleteMany({ where: { id: { startsWith: 'pgs_order_' } } });
    await prisma.cart.deleteMany({ where: { id: { startsWith: 'pgs_cart_' } } });
    await prisma.productVariant.deleteMany({ where: { id: { startsWith: 'pgs_var_' } } });
    await prisma.product.deleteMany({ where: { id: { startsWith: 'pgs_prod_' } } });
    await prisma.category.deleteMany({ where: { id: { startsWith: 'pgs_cat_' } } });
    await prisma.address.deleteMany({ where: { id: { startsWith: 'pgs_addr_' } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'pgs_user_' } } });

    const a = await prisma.user.create({
      data: {
        id: `pgs_user_a_${ts}`,
        email: `pgs_a_${ts}@example.com`,
        firstName: 'Stock',
        lastName: 'RacerA',
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    userA = a.id;

    const b = await prisma.user.create({
      data: {
        id: `pgs_user_b_${ts}`,
        email: `pgs_b_${ts}@example.com`,
        firstName: 'Stock',
        lastName: 'RacerB',
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    userB = b.id;

    addrA = (
      await prisma.address.create({
        data: {
          id: `pgs_addr_a_${ts}`,
          userId: userA,
          type: AddressType.HOME,
          fullName: 'Racer A',
          phone: '9876543210',
          line1: '1 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
      })
    ).id;

    addrB = (
      await prisma.address.create({
        data: {
          id: `pgs_addr_b_${ts}`,
          userId: userB,
          type: AddressType.HOME,
          fullName: 'Racer B',
          phone: '9876543211',
          line1: '2 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400002',
          country: 'India',
        },
      })
    ).id;

    categoryId = (
      await prisma.category.create({
        data: { id: `pgs_cat_${ts}`, name: 'PGS Stock', slug: `pgs-stock-${ts}` },
      })
    ).id;

    productId = (
      await prisma.product.create({
        data: {
          id: `pgs_prod_${ts}`,
          name: productName,
          slug: `pgs-stock-tee-${ts}`,
          description: 'Stock concurrency test product',
          basePrice: 500,
          categoryId,
          status: ProductStatus.ACTIVE,
        },
      })
    ).id;

    variantId = (
      await prisma.productVariant.create({
        data: {
          id: `pgs_var_${ts}`,
          productId,
          sku: `PGS-VAR-${ts}`,
          size: 'M',
          stock: 1,
          price: 500,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.order.deleteMany({ where: { id: { startsWith: 'pgs_order_' } } });
      await prisma.order.deleteMany({ where: { userId: { in: [userA, userB] } } });
      await prisma.cart.deleteMany({ where: { id: { startsWith: 'pgs_cart_' } } });
      await prisma.productVariant.deleteMany({ where: { id: { startsWith: 'pgs_var_' } } });
      await prisma.product.deleteMany({ where: { id: { startsWith: 'pgs_prod_' } } });
      await prisma.category.deleteMany({ where: { id: { startsWith: 'pgs_cat_' } } });
      await prisma.address.deleteMany({ where: { id: { startsWith: 'pgs_addr_' } } });
      await prisma.user.deleteMany({ where: { id: { startsWith: 'pgs_user_' } } });
      await prisma.$disconnect();
    }
  });

  async function setStock(n: number) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: n } });
  }

  /** Fresh cart for a user containing exactly one line of `quantity` units. */
  async function seedCart(userId: string, tag: string, quantity: number) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { id: `pgs_cart_${tag}_${ts}`, userId } });
    }
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity } });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }

  function dto(shippingAddressId: string) {
    return { paymentMethod: PaymentMethod.RAZORPAY, shippingAddressId } as any;
  }

  async function resetOrders() {
    await prisma.order.deleteMany({ where: { userId: { in: [userA, userB] } } });
  }

  it('stock=1, two concurrent checkouts of 1 unit: exactly one order; stock lands at 0, never negative; loser leaves no rows', async () => {
    await resetOrders();
    await setStock(1);
    await seedCart(userA, 'a', 1);
    await seedCart(userB, 'b', 1);

    const results = await Promise.allSettled([
      service.create(userA, dto(addrA)),
      service.create(userB, dto(addrB)),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toBe(`Insufficient stock for ${productName}`);

    // Stock landed at exactly 0 — never negative
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(variant!.stock).toBe(0);

    // Exactly one order exists overall
    const orders = await prisma.order.findMany({ where: { userId: { in: [userA, userB] } } });
    expect(orders).toHaveLength(1);

    // The losing checkout was fully rolled back: no order, no items, no payment rows
    const winnerId = orders[0].userId;
    const loserId = winnerId === userA ? userB : userA;
    expect(await prisma.order.count({ where: { userId: loserId } })).toBe(0);
    expect(await prisma.orderItem.count({ where: { order: { userId: loserId } } })).toBe(0);
    expect(await prisma.payment.count({ where: { order: { userId: loserId } } })).toBe(0);

    // Winner has exactly one item line; product sold counter incremented once
    expect(await prisma.orderItem.count({ where: { orderId: orders[0].id } })).toBe(1);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.totalSold).toBe(1);
  });

  it('stock=5, two concurrent checkouts of 4 units: only one fits; stock lands at 1, never negative', async () => {
    await resetOrders();
    await setStock(5);
    await seedCart(userA, 'a', 4);
    await seedCart(userB, 'b', 4);

    const results = await Promise.allSettled([
      service.create(userA, dto(addrA)),
      service.create(userB, dto(addrB)),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.message).toBe(`Insufficient stock for ${productName}`);

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(variant!.stock).toBe(1);

    const orders = await prisma.order.findMany({ where: { userId: { in: [userA, userB] } } });
    expect(orders).toHaveLength(1);
  });

  it('checkout asking for more than available fails fast and creates no order', async () => {
    await resetOrders();
    await setStock(1);
    await seedCart(userA, 'a', 2);

    await expect(service.create(userA, dto(addrA))).rejects.toThrow(
      `Insufficient stock for ${productName}`,
    );

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(variant!.stock).toBe(1); // untouched
    expect(await prisma.order.count({ where: { userId: userA } })).toBe(0);
  });

  it('after stock is exhausted by a winner, a subsequent checkout cannot oversell the drained stock', async () => {
    await resetOrders();
    await setStock(1);
    await seedCart(userA, 'a', 1);
    await seedCart(userB, 'b', 1);

    // Sequential: A buys the last unit...
    const winner = await service.create(userA, dto(addrA));
    expect(winner).toBeDefined();

    // ...then B's checkout of the same last unit is refused
    await expect(service.create(userB, dto(addrB))).rejects.toThrow(
      `Insufficient stock for ${productName}`,
    );

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(variant!.stock).toBe(0);
    expect(await prisma.order.count({ where: { userId: { in: [userA, userB] } } })).toBe(1);
  });
});
