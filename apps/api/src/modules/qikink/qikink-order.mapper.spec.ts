import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  mapOrderToQikinkPayload,
  toQikinkOrderNumber,
} from './qikink-order.mapper';

describe('qikink-order.mapper', () => {
  const mockUser = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '9876543210',
  };

  const mockAddress = {
    id: 'addr_1',
    userId: 'user_1',
    type: 'HOME' as const,
    fullName: 'John Doe',
    phone: '9876543210',
    line1: '123 Main St',
    line2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseOrder = {
    id: 'ord_123456789012',
    orderNumber: 'VYQ10001',
    userId: 'user_1',
    status: 'CONFIRMED' as const,
    paymentStatus: 'PAID' as const,
    paymentMethod: PaymentMethod.RAZORPAY,
    subtotal: 1000 as any,
    discountAmount: 0 as any,
    shippingAmount: 50 as any,
    taxAmount: 0 as any,
    total: 1050 as any,
    couponId: null,
    couponCode: null,
    shippingAddressId: 'addr_1',
    billingAddressId: null,
    notes: null,
    trackingNumber: null,
    carrier: null,
    estimatedDelivery: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    paymentId: null,
    paymentGatewayRef: null,
    invoiceUrl: null,
    qikinkOrderId: null,
    qikinkOrderNumber: null,
    qikinkStatus: null,
    qikinkSyncStatus: 'PENDING' as const,
    qikinkSyncedAt: null,
    qikinkLastError: null,
    qikinkAttempts: 0,
    qikinkPayload: null,
    qikinkResponse: null,
    qikinkAwb: null,
    qikinkCourier: null,
    qikinkShippedAt: null,
    qikinkIdempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    shippingAddress: mockAddress,
    user: mockUser,
  };

  describe('toQikinkOrderNumber', () => {
    it('should format order number within 15 characters', () => {
      const num = toQikinkOrderNumber({
        ...baseOrder,
        orderNumber: 'VYQ123456789012345',
      });
      expect(num.length).toBeLessThanOrEqual(15);
    });

    it('should prefer existing qikinkOrderNumber if <= 15 chars', () => {
      const num = toQikinkOrderNumber({
        ...baseOrder,
        qikinkOrderNumber: 'QIK123',
      });
      expect(num).toBe('QIK123');
    });
  });

  describe('mapOrderToQikinkPayload', () => {
    it('should map a valid normal apparel order correctly', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_1',
            orderId: 'ord_1',
            productId: 'prod_1',
            variantId: 'var_1',
            productName: 'Custom T-Shirt',
            variantLabel: 'Black / M',
            sku: 'TS-BLK-M',
            imageUrl: 'https://example.com/img.jpg',
            unitPrice: 500 as any,
            quantity: 2,
            totalPrice: 1000 as any,
            product: {
              id: 'prod_1',
              name: 'Custom T-Shirt',
              slug: 'custom-tshirt',
              description: 'Desc',
              shortDescription: null,
              basePrice: 500 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'TS-BASE',
              barcode: null,
              categoryId: 'cat_apparel',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: 'QIK-BASE-TS',
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [
                {
                  placement: 'fr',
                  placementSku: 'TS-FR-FRONT',
                  designCode: 'FRONT01',
                  widthInches: 10,
                  heightInches: 12,
                  designUrl: 'https://example.com/front.png',
                  mockupUrl: 'https://example.com/mock.jpg',
                },
              ] as any,
              qikinkSearchFromMyProducts: 0,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 't-shirts', name: 'T-Shirts' },
            },
            variant: {
              id: 'var_1',
              productId: 'prod_1',
              sku: 'TS-BLK-M',
              size: 'M',
              color: 'Black',
              colorHex: '#000000',
              price: 500 as any,
              compareAtPrice: null,
              stock: 10,
              lowStockAt: 5,
              imageUrl: null,
              weightGrams: null,
              isActive: true,
              qikinkSku: 'QIK-TS-BLK-M',
              qikinkPrice: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      const payload = mapOrderToQikinkPayload(order, { shipping: '1' });
      expect(payload.gateway).toBe('Prepaid');
      expect(payload.line_items).toHaveLength(1);

      const line = payload.line_items[0];
      expect(line.sku).toBe('QIK-TS-BLK-M');
      expect(line.search_from_my_products).toBe(0);
      expect(line.quantity).toBe('2');
      expect(line.price).toBe('500');

      expect(line.designs).toHaveLength(1);
      const d = line.designs![0];
      expect(d.design_code).toBe('FRONT01');
      expect(d.placement_sku).toBe('TS-FR-FRONT');
      expect(d.width_inches).toBe('10');
      expect(d.height_inches).toBe('12');
      expect(d.design_link).toBe('https://example.com/front.png');
    });

    it('should throw BadRequestException if Qikink SKU is missing for product/variant', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_1',
            orderId: 'ord_1',
            productId: 'prod_1',
            variantId: 'var_1',
            productName: 'Custom Hoodie',
            variantLabel: 'L',
            sku: 'VYQ-HOODIE-L',
            imageUrl: null,
            unitPrice: 1000 as any,
            quantity: 1,
            totalPrice: 1000 as any,
            product: {
              id: 'prod_1',
              name: 'Custom Hoodie',
              slug: 'custom-hoodie',
              description: 'Desc',
              shortDescription: null,
              basePrice: 1000 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'VYQ-HOODIE',
              barcode: null,
              categoryId: 'cat_hoodies',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: null,
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [],
              qikinkSearchFromMyProducts: 1,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 'hoodies', name: 'Hoodies' },
            },
            variant: {
              id: 'var_1',
              productId: 'prod_1',
              sku: 'VYQ-HOODIE-L',
              size: 'L',
              color: null,
              colorHex: null,
              price: 1000 as any,
              compareAtPrice: null,
              stock: 5,
              lowStockAt: 2,
              imageUrl: null,
              weightGrams: null,
              isActive: true,
              qikinkSku: null,
              qikinkPrice: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      expect(() => mapOrderToQikinkPayload(order, { shipping: '1' })).toThrow(
        BadRequestException,
      );
    });

    it('should allow valid accessory/AOP order without print dimensions', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_acc',
            orderId: 'ord_1',
            productId: 'prod_acc',
            variantId: null,
            productName: 'Custom Mug',
            variantLabel: null,
            sku: 'MUG-01',
            imageUrl: null,
            unitPrice: 300 as any,
            quantity: 1,
            totalPrice: 300 as any,
            product: {
              id: 'prod_acc',
              name: 'Custom Mug',
              slug: 'custom-mug',
              description: 'Mug',
              shortDescription: null,
              basePrice: 300 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'MUG-01',
              barcode: null,
              categoryId: 'cat_acc',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: 'QIK-MUG',
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [
                {
                  placement: 'fr',
                  placementSku: 'MUG-FR',
                  designCode: 'MUGDESIGN',
                  designUrl: 'https://example.com/mug.png',
                },
              ] as any,
              qikinkSearchFromMyProducts: 0,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 'accessories', name: 'Accessories' },
            },
            variant: null,
          },
        ],
      };

      const payload = mapOrderToQikinkPayload(order, { shipping: '1' });
      expect(payload.line_items[0].designs![0].width_inches).toBe('');
      expect(payload.line_items[0].designs![0].height_inches).toBe('');
    });

    it('should throw BadRequestException if apparel dimensions are missing or <= 0', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_1',
            orderId: 'ord_1',
            productId: 'prod_1',
            variantId: null,
            productName: 'Custom Shirt',
            variantLabel: null,
            sku: 'SHIRT-01',
            imageUrl: null,
            unitPrice: 800 as any,
            quantity: 1,
            totalPrice: 800 as any,
            product: {
              id: 'prod_1',
              name: 'Custom Shirt',
              slug: 'custom-shirt',
              description: 'Shirt',
              shortDescription: null,
              basePrice: 800 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'SHIRT-01',
              barcode: null,
              categoryId: 'cat_shirt',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: 'QIK-SHIRT',
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [
                {
                  placement: 'fr',
                  placementSku: 'SHIRT-FR',
                  designCode: 'SHIRT01',
                  designUrl: 'https://example.com/shirt.png',
                },
              ] as any,
              qikinkSearchFromMyProducts: 0,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 't-shirts', name: 'T-Shirts' },
            },
            variant: null,
          },
        ],
      };

      expect(() => mapOrderToQikinkPayload(order, { shipping: '1' })).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if placementSku is missing', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_1',
            orderId: 'ord_1',
            productId: 'prod_1',
            variantId: null,
            productName: 'Custom Shirt',
            variantLabel: null,
            sku: 'SHIRT-01',
            imageUrl: null,
            unitPrice: 800 as any,
            quantity: 1,
            totalPrice: 800 as any,
            product: {
              id: 'prod_1',
              name: 'Custom Shirt',
              slug: 'custom-shirt',
              description: 'Shirt',
              shortDescription: null,
              basePrice: 800 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'SHIRT-01',
              barcode: null,
              categoryId: 'cat_shirt',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: 'QIK-SHIRT',
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [
                {
                  placement: 'fr',
                  designCode: 'SHIRT01',
                  widthInches: 10,
                  heightInches: 10,
                  designUrl: 'https://example.com/shirt.png',
                },
              ] as any,
              qikinkSearchFromMyProducts: 0,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 't-shirts', name: 'T-Shirts' },
            },
            variant: null,
          },
        ],
      };

      expect(() => mapOrderToQikinkPayload(order, { shipping: '1' })).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if designCode > 15 characters', () => {
      const order = {
        ...baseOrder,
        items: [
          {
            id: 'item_1',
            orderId: 'ord_1',
            productId: 'prod_1',
            variantId: null,
            productName: 'Custom Shirt',
            variantLabel: null,
            sku: 'SHIRT-01',
            imageUrl: null,
            unitPrice: 800 as any,
            quantity: 1,
            totalPrice: 800 as any,
            product: {
              id: 'prod_1',
              name: 'Custom Shirt',
              slug: 'custom-shirt',
              description: 'Shirt',
              shortDescription: null,
              basePrice: 800 as any,
              compareAtPrice: null,
              costPrice: null,
              sku: 'SHIRT-01',
              barcode: null,
              categoryId: 'cat_shirt',
              collectionId: null,
              status: 'ACTIVE' as const,
              isFeatured: false,
              isNewArrival: false,
              isBestSeller: false,
              isTrending: false,
              tags: [],
              materials: null,
              careInstructions: null,
              weightGrams: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: [],
              averageRating: 0,
              reviewCount: 0,
              totalSold: 0,
              viewCount: 0,
              qikinkSku: 'QIK-SHIRT',
              qikinkProductId: null,
              qikinkPrintTypeId: 1,
              qikinkDesigns: [
                {
                  placement: 'fr',
                  placementSku: 'FR',
                  designCode: 'DESIGNCODE123456789',
                  widthInches: 10,
                  heightInches: 10,
                  designUrl: 'https://example.com/shirt.png',
                },
              ] as any,
              qikinkSearchFromMyProducts: 0,
              qikinkSyncedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
              category: { slug: 't-shirts', name: 'T-Shirts' },
            },
            variant: null,
          },
        ],
      };

      expect(() => mapOrderToQikinkPayload(order, { shipping: '1' })).toThrow(
        BadRequestException,
      );
    });
  });
});
