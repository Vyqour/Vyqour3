import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('addItem', () => {
    it('should throw NotFoundException if product is missing or not ACTIVE', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.addItem({ productId: 'p1', quantity: 1 }, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate stock for variant-less product with trackInventory=true', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'ACTIVE',
        variants: [],
        inventory: { quantity: 10, reserved: 8, trackInventory: true },
      });
      prisma.cart.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'user1',
        items: [],
      });

      // Available stock = 10 - 8 = 2. Requesting 3 should fail.
      await expect(
        service.addItem({ productId: 'p1', quantity: 3 }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow adding variant-less product within available stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        basePrice: 100,
        images: [],
        status: 'ACTIVE',
        variants: [],
        inventory: { quantity: 10, reserved: 8, trackInventory: true },
      });
      const cartObj = {
        id: 'c1',
        userId: 'user1',
        items: [],
      };
      prisma.cart.findUnique.mockResolvedValue(cartObj);
      prisma.cartItem.create.mockResolvedValue({ id: 'ci1', productId: 'p1', quantity: 2 });

      const result = await service.addItem({ productId: 'p1', quantity: 2 }, 'user1');
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'c1',
          productId: 'p1',
          variantId: undefined,
          quantity: 2,
        },
      });
      expect(result).toBeDefined();
    });

    it('should bypass stock check if trackInventory=false for variant-less product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        basePrice: 100,
        images: [],
        status: 'ACTIVE',
        variants: [],
        inventory: { quantity: 10, reserved: 10, trackInventory: false },
      });
      prisma.cart.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'user1',
        items: [],
      });

      await service.addItem({ productId: 'p1', quantity: 5 }, 'user1');
      expect(prisma.cartItem.create).toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('should validate stock for variant-less item when updating quantity', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'user1',
        items: [{ id: 'ci1', productId: 'p1', variantId: null, quantity: 1 }],
      });
      prisma.inventory.findUnique.mockResolvedValue({
        productId: 'p1',
        quantity: 5,
        reserved: 4,
        trackInventory: true,
      });

      // Available = 5 - 4 = 1. Updating to 2 should fail.
      await expect(
        service.updateItem('ci1', { quantity: 2 }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
