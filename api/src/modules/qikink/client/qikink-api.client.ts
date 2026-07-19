import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  QikinkCreateOrderPayload,
  QikinkCreateOrderResponse,
  QikinkOrderStatusResponse,
  QikinkTokenResponse,
} from './qikink.types';

@Injectable()
export class QikinkApiClient {
  private readonly logger = new Logger(QikinkApiClient.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled() {
    return this.config.get<boolean>('qikink.enabled') === true;
  }

  getBaseUrl() {
    return (this.config.get<string>('qikink.baseUrl') || 'https://sandbox.qikink.com').replace(
      /\/$/,
      '',
    );
  }

  private clientId() {
    return this.config.get<string>('qikink.clientId') || '';
  }

  private clientSecret() {
    const sandbox = this.config.get<boolean>('qikink.sandbox');
    if (sandbox) {
      return (
        this.config.get<string>('qikink.sandboxSecret') ||
        this.config.get<string>('qikink.clientSecret') ||
        ''
      );
    }
    return this.config.get<string>('qikink.clientSecret') || '';
  }

  async getAccessToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.token;
    }
    const clientId = this.clientId();
    const secret = this.clientSecret();
    if (!clientId || !secret) {
      throw new Error('Qikink credentials missing (QIKINK_CLIENT_ID / secret)');
    }

    const body = new URLSearchParams();
    body.set('ClientId', clientId);
    body.set('client_secret', secret);

    const started = Date.now();
    const url = `${this.getBaseUrl()}/api/token`;
    let statusCode = 0;
    let responseBody: unknown = null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      statusCode = res.status;
      const text = await res.text();
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
      if (!res.ok) {
        throw new Error(`Qikink token failed (${res.status}): ${text}`);
      }
      const data = responseBody as QikinkTokenResponse;
      const token = data.Accesstoken || data.AccessToken || data.access_token;
      if (!token) throw new Error('Qikink token response missing Accesstoken');
      this.token = token;
      const expiresIn = Number(data.expires_in || 3600);
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      await this.log({
        direction: 'outbound',
        method: 'POST',
        path: '/api/token',
        statusCode,
        success: true,
        requestBody: { ClientId: clientId },
        responseBody: { expires_in: expiresIn },
        durationMs: Date.now() - started,
      });
      return token;
    } catch (err) {
      await this.log({
        direction: 'outbound',
        method: 'POST',
        path: '/api/token',
        statusCode,
        success: false,
        requestBody: { ClientId: clientId },
        responseBody,
        error: (err as Error).message,
        durationMs: Date.now() - started,
      });
      throw err;
    }
  }

  async createOrder(
    payload: QikinkCreateOrderPayload,
    orderId?: string,
  ): Promise<QikinkCreateOrderResponse> {
    return this.request<QikinkCreateOrderResponse>('POST', '/api/order/create', payload, orderId);
  }

  /**
   * Optional status endpoint. Not fully documented in public Postman collection
   * for all accounts — failures are treated as soft (caller decides).
   */
  async getOrderStatus(params: {
    orderId?: string | number;
    orderNumber?: string;
    internalOrderId?: string;
  }): Promise<QikinkOrderStatusResponse | null> {
    const endpoint = this.config.get<string>('qikink.statusEndpoint') || '/api/order/status';
    const qs = new URLSearchParams();
    if (params.orderId) qs.set('order_id', String(params.orderId));
    if (params.orderNumber) qs.set('order_number', String(params.orderNumber));
    const path = `${endpoint}?${qs.toString()}`;
    try {
      return await this.request<QikinkOrderStatusResponse>(
        'GET',
        path,
        undefined,
        params.internalOrderId,
      );
    } catch (err) {
      this.logger.warn(`Qikink status poll unavailable: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Optional product list endpoint for catalog sync.
   * Public docs emphasize order create; product listing may require Live API access.
   */
  async listProducts(): Promise<unknown> {
    const endpoint = this.config.get<string>('qikink.productsEndpoint') || '/api/products';
    return this.request('GET', endpoint);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    orderId?: string,
    retried = false,
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const started = Date.now();
    let statusCode = 0;
    let responseBody: unknown = null;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ClientId: this.clientId(),
          Accesstoken: token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      });
      statusCode = res.status;
      const text = await res.text();
      try {
        responseBody = text ? JSON.parse(text) : null;
      } catch {
        responseBody = text;
      }

      if (res.status === 401 && !retried) {
        this.token = null;
        await this.getAccessToken(true);
        return this.request<T>(method, path, body, orderId, true);
      }

      if (!res.ok) {
        throw new Error(`Qikink ${method} ${path} failed (${res.status}): ${text}`);
      }

      await this.log({
        direction: 'outbound',
        method,
        path,
        orderId,
        statusCode,
        success: true,
        requestBody: body as object,
        responseBody,
        durationMs: Date.now() - started,
      });
      return responseBody as T;
    } catch (err) {
      await this.log({
        direction: 'outbound',
        method,
        path,
        orderId,
        statusCode,
        success: false,
        requestBody: body as object,
        responseBody,
        error: (err as Error).message,
        durationMs: Date.now() - started,
      });
      throw err;
    }
  }

  private async log(data: {
    direction: string;
    method?: string;
    path?: string;
    orderId?: string;
    statusCode?: number;
    success: boolean;
    requestBody?: unknown;
    responseBody?: unknown;
    error?: string;
    durationMs?: number;
  }) {
    try {
      await this.prisma.qikinkApiLog.create({
        data: {
          direction: data.direction,
          method: data.method,
          path: data.path,
          orderId: data.orderId,
          statusCode: data.statusCode,
          success: data.success,
          requestBody: (data.requestBody as object) ?? undefined,
          responseBody: (data.responseBody as object) ?? undefined,
          error: data.error,
          durationMs: data.durationMs,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write Qikink API log: ${(err as Error).message}`);
    }
  }
}
