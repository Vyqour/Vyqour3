import { CartService } from './cart.service';

describe('CartService stock and coupon safeguards', () => {
  let prisma: any;
  let service: CartService;

  const variant = {
    id: 'variant_1',
    productId: 'product_1',
    isActive: true,
    stock: 3,
    price: 500,
  };
  const product = {
    id: 'product_1',
    status: 'ACTIVE',
    basePrice: 500,
    variants: [variant],
    images: [],
  };
  const cart = (overrides: Record<string, unknown> = {}) => ({
    id: 'cart_1',
    userId: 'user_1',
    sessionId: null,
    couponCode: null,
    items: [
      {
        id: 'item_1',
        productId: 'product_1',
        variantId: 'variant_1',
        quantity: 2,
        product,
        variant,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      cart: {
        findUnique: jest.fn().mockResolvedValue(cart()),
        create: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      coupon: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new CartService(prisma);
  });

  it('rejects adding a quantity that would exceed remaining variant stock', async () => {
    await expect(
      service.addItem({ productId: 'product_1', variantId: 'variant_1', quantity: 2 }, 'user_1'),
    ).rejects.toThrow('Only 3 unit(s) are available for this variant');

    expect(prisma.cartItem.update).not.toHaveBeenCalled();
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('rejects updating a cart line above available stock', async () => {
    await expect(
      service.updateItem('item_1', { quantity: 4 }, 'user_1'),
    ).rejects.toThrow('Only 3 unit(s) are available for this variant');

    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it('does not grant free shipping from an expired free-shipping coupon', async () => {
    prisma.cart.findUnique.mockResolvedValue(
      cart({ couponCode: 'FREESHIP', items: [{ ...cart().items[0], quantity: 1 }] }),
    );
    prisma.coupon.findUnique.mockResolvedValue({
      code: 'FREESHIP',
      type: 'FREE_SHIPPING',
      value: 0,
      isActive: true,
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() - 60_000),
      usageLimit: null,
      usageCount: 0,
      minOrderAmount: null,
    });

    const result = await service.getCart('user_1');

    expect(result.summary.shippingAmount).toBe(99);
    expect(result.summary.couponCode).toBeNull();
  });

  it('rejects a coupon after the customer has reached its per-user usage limit', async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      code: 'ONCE',
      type: 'PERCENTAGE',
      value: 10,
      isActive: true,
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      usageLimit: null,
      usageCount: 0,
      perUserLimit: 1,
      minOrderAmount: null,
    });
    prisma.order.count.mockResolvedValue(1);

    await expect(service.applyCoupon('ONCE', 'user_1')).rejects.toThrow(
      'You have already used this coupon the maximum number of times',
    );
    expect(prisma.cart.update).not.toHaveBeenCalled();
  });

  it('rejects applying a coupon before its start time', async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      code: 'NOTYET',
      type: 'PERCENTAGE',
      value: 10,
      isActive: true,
      startsAt: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 60_000 * 60),
      usageLimit: null,
      usageCount: 0,
      minOrderAmount: null,
    });

    await expect(service.applyCoupon('NOTYET', 'user_1')).rejects.toThrow(
      'Coupon is not active',
    );
    expect(prisma.cart.update).not.toHaveBeenCalled();
  });
});
