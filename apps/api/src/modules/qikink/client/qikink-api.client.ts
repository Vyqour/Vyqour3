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
    return (
      this.config.get<string>('qikink.baseUrl') || 'https://sandbox.qikink.com'
    ).replace(/\/$/, '');
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

  async getAccessToken(force = false, logToDatabase = true): Promise<string> {
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
      if (logToDatabase)
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
      if (logToDatabase)
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
    return this.request<QikinkCreateOrderResponse>(
      'POST',
      '/api/order/create',
      payload,
      orderId,
    );
  }

  /**
   * Qikink tenants may expose the legacy single-order endpoint instead of
   * /api/order/list. Keep the path configurable and accept direct objects
   * as well as the newer { data: [...] } response envelope.
   */
  async getOrderStatus(params: {
    orderId?: string | number;
    orderNumber?: string;
    internalOrderId?: string;
    logToDatabase?: boolean;
  }): Promise<QikinkOrderStatusResponse | null> {
    const endpoint =
      this.config.get<string>('qikink.statusEndpoint') || '/api/order';
    const qs = new URLSearchParams();
    if (params.orderId) qs.set('id', String(params.orderId));
    else if (params.orderNumber)
      qs.set('order_reference_no', String(params.orderNumber));
    else return null;
    try {
      const result = await this.request<unknown>(
        'GET',
        `${endpoint}?${qs.toString()}`,
        undefined,
        params.internalOrderId,
        false,
        params.logToDatabase !== false,
      );
      if (!result || typeof result !== 'object') return null;
      const envelope = result as Record<string, unknown>;
      if (envelope.success === false || envelope.error) return null;

      const data = envelope.data;
      const rows = Array.isArray(data)
        ? (data as Array<Record<string, unknown>>)
        : data && typeof data === 'object'
          ? [data as Record<string, unknown>]
          : Array.isArray(result)
            ? (result as Array<Record<string, unknown>>)
            : [envelope];

      // Never attach a status or tracking number to a different order.
      const row = rows.find((item) => {
        if (params.orderId) {
          const identifiers = [
            item.qikink_order_id,
            item.order_id,
            item.id,
          ].filter((value) => value != null);
          return (
            identifiers.length === 0 ||
            identifiers.some(
              (value) => String(value) === String(params.orderId),
            )
          );
        }
        const number = String(
          item.order_number || item.number || item.order_reference_no || '',
        );
        return number.endsWith(String(params.orderNumber || ''));
      });
      if (!row) return null;
      const shipping =
        row.shipping && typeof row.shipping === 'object'
          ? (row.shipping as Record<string, unknown>)
          : {};
      const awb = (shipping.awb || row.awb || row.tracking_number) as
        | string
        | undefined;
      const trackingLink = (shipping.tracking_link ||
        row.tracking_link ||
        row.tracking_url) as string | undefined;
      const courier = (shipping.courier_provider_name ||
        row.courier_provider_name ||
        row.courier ||
        row.carrier) as string | undefined;
      return {
        order_id: (row.qikink_order_id || row.order_id || row.id) as
          | string
          | number
          | undefined,
        order_number: (row.order_number || row.number || (row.qikink_order_id != null ? row.order_id : undefined)) as string | undefined,
        status: (row.status || row.order_status) as string | undefined,
        awb,
        tracking_number: awb,
        tracking_link: trackingLink,
        courier_provider_name: courier,
        courier,
        shipping_type: row.shipping_type as string | undefined,
        payment_type: row.payment_type as string | undefined,
        raw: row,
      };
    } catch (err) {
      this.logger.warn(
        `Qikink status poll unavailable: ${(err as Error).message}`,
      );
      return null;
    }
  }
  /**
   * Optional product list endpoint for catalog sync.
   * Public docs emphasize order create; product listing may require Live API access.
   */
  async listProducts(): Promise<unknown> {
    const endpoint =
      this.config.get<string>('qikink.productsEndpoint') || '/api/products';
    return this.request('GET', endpoint);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    orderId?: string,
    retried = false,
    logToDatabase = true,
  ): Promise<T> {
    const token = await this.getAccessToken(false, logToDatabase);
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
        await this.getAccessToken(true, logToDatabase);
        return this.request<T>(
          method,
          path,
          body,
          orderId,
          true,
          logToDatabase,
        );
      }

      if (!res.ok) {
        throw new Error(`Qikink ${method} ${path} failed (${res.status})`);
      }

      // Some provider APIs return HTTP 200 with an application-level error.
      // Treat explicit errors as failures, not as uncertain successful submissions.
      if (this.hasProviderError(responseBody)) {
        const message = this.providerErrorMessage(responseBody);
        throw new Error(`Qikink ${method} ${path}: ${message}`);
      }

      if (logToDatabase)
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
      if (logToDatabase)
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

  private hasProviderError(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false;
    const value = body as Record<string, unknown>;
    if (value.error) return true;
    if (value.success === false) return true;
    if (
      value.status_code != null &&
      !['200', '1', 'success'].includes(String(value.status_code).toLowerCase())
    ) {
      return true;
    }
    if (
      value.code != null &&
      !['1', '200', 'success'].includes(String(value.code).toLowerCase())
    ) {
      return true;
    }
    return false;
  }

  private providerErrorMessage(body: unknown): string {
    if (!body || typeof body !== 'object')
      return 'Provider returned an error response';
    const value = body as Record<string, unknown>;
    const candidate = value.message || value.msg || value.error || value.status;
    if (typeof candidate === 'string') {
      return candidate
        .replace(
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
          '[REDACTED_EMAIL]',
        )
        .replace(/\b\d{10,15}\b/g, '[REDACTED_PHONE]')
        .slice(0, 300);
    }
    return 'Provider returned an error response';
  }

  private redactSensitiveData(value: unknown): unknown {
    const sensitiveKey =
      /(address|phone|mobile|email|first_?name|last_?name|full_?name|customer|recipient)/i;
    if (Array.isArray(value))
      return value.map((item) => this.redactSensitiveData(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : this.redactSensitiveData(item),
      ]),
    );
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
          requestBody:
            data.requestBody == null
              ? undefined
              : (this.redactSensitiveData(data.requestBody) as object),
          responseBody:
            data.responseBody == null
              ? undefined
              : (this.redactSensitiveData(data.responseBody) as object),
          error: data.error,
          durationMs: data.durationMs,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write Qikink API log: ${(err as Error).message}`,
      );
    }
  }
}
