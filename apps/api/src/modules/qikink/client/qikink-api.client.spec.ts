import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QikinkApiClient } from './qikink-api.client';

describe('QikinkApiClient', () => {
  let client: QikinkApiClient;
  let mockPrisma: any;
  let mockConfig: any;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockPrisma = {
      qikinkApiLog: { create: jest.fn().mockResolvedValue({}) },
    };
    mockConfig = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'qikink.enabled': true,
          'qikink.baseUrl': 'https://api.qikink.com',
          'qikink.clientId': 'test-client',
          'qikink.clientSecret': 'test-secret',
          'qikink.sandbox': false,
        };
        return values[key] ?? null;
      }),
    };
    client = new QikinkApiClient(
      mockConfig as ConfigService,
      mockPrisma as PrismaService,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('treats an HTTP 200 application-level error as a failed request', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ Accesstoken: 'token', expires_in: 3600 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status_code: 400, message: 'Invalid SKU' }),
      } as unknown as Response);

    await expect(client.createOrder({
      order_number: 'VYQ123456',
      qikink_shipping: '1',
      gateway: 'Prepaid',
      total_order_value: '500',
      line_items: [{
        search_from_my_products: 1,
        quantity: '1',
        price: '500',
        sku: 'INVALID-SKU',
      }],
    })).rejects.toThrow('Invalid SKU');

    expect(mockPrisma.qikinkApiLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          responseBody: expect.objectContaining({ status_code: 400 }),
        }),
      }),
    );
  });

  it('uses the documented order list endpoint and normalizes shipping tracking fields', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ Accesstoken: 'token', expires_in: 3600 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: [{
            order_id: 123,
            number: '1_VYQ123456',
            status: 'In-Transit',
            shipping: {
              awb: '77908747221',
              tracking_link: 'https://tracking.example/77908747221',
              courier_provider_name: 'Bluedart Surface',
            },
          }],
        }),
      } as unknown as Response);

    const result = await client.getOrderStatus({ orderId: 123, internalOrderId: 'internal-1' });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/order/list?id=123'),
      expect.any(Object),
    );
    expect(result).toEqual(expect.objectContaining({
      order_id: 123,
      status: 'In-Transit',
      awb: '77908747221',
      tracking_number: '77908747221',
      tracking_link: 'https://tracking.example/77908747221',
      courier: 'Bluedart Surface',
    }));
  });

  it('redacts customer contact and shipping details from stored API logs', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ Accesstoken: 'token', expires_in: 3600 }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ order_id: 123, status_code: 200 }),
      } as unknown as Response);

    await client.createOrder({
      order_number: 'VYQ123456',
      qikink_shipping: '1',
      gateway: 'Prepaid',
      total_order_value: '500',
      line_items: [{
        search_from_my_products: 1,
        quantity: '1',
        price: '500',
        sku: 'TS-BK-M',
      }],
      shipping_address: {
        first_name: 'Test',
        last_name: 'Customer',
        address1: '123 Private Street',
        phone: '9876543210',
        email: 'customer@example.com',
        city: 'Ranchi',
        zip: '834001',
        province: 'Jharkhand',
        country_code: 'IN',
      },
    });

    const orderLog = mockPrisma.qikinkApiLog.create.mock.calls
      .map((call: any[]) => call[0].data)
      .find((row: any) => row.path === '/api/order/create');
    expect(orderLog.requestBody.shipping_address).toBe('[REDACTED]');
  });
});
