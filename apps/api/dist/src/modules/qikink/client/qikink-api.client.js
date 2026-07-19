"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QikinkApiClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikinkApiClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../prisma/prisma.service");
let QikinkApiClient = QikinkApiClient_1 = class QikinkApiClient {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(QikinkApiClient_1.name);
        this.token = null;
        this.tokenExpiresAt = 0;
    }
    isEnabled() {
        return this.config.get('qikink.enabled') === true;
    }
    getBaseUrl() {
        return (this.config.get('qikink.baseUrl') || 'https://sandbox.qikink.com').replace(/\/$/, '');
    }
    clientId() {
        return this.config.get('qikink.clientId') || '';
    }
    clientSecret() {
        const sandbox = this.config.get('qikink.sandbox');
        if (sandbox) {
            return (this.config.get('qikink.sandboxSecret') ||
                this.config.get('qikink.clientSecret') ||
                '');
        }
        return this.config.get('qikink.clientSecret') || '';
    }
    async getAccessToken(force = false) {
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
        let responseBody = null;
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
            }
            catch {
                responseBody = text;
            }
            if (!res.ok) {
                throw new Error(`Qikink token failed (${res.status}): ${text}`);
            }
            const data = responseBody;
            const token = data.Accesstoken || data.AccessToken || data.access_token;
            if (!token)
                throw new Error('Qikink token response missing Accesstoken');
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
        }
        catch (err) {
            await this.log({
                direction: 'outbound',
                method: 'POST',
                path: '/api/token',
                statusCode,
                success: false,
                requestBody: { ClientId: clientId },
                responseBody,
                error: err.message,
                durationMs: Date.now() - started,
            });
            throw err;
        }
    }
    async createOrder(payload, orderId) {
        return this.request('POST', '/api/order/create', payload, orderId);
    }
    async getOrderStatus(params) {
        const endpoint = this.config.get('qikink.statusEndpoint') || '/api/order/status';
        const qs = new URLSearchParams();
        if (params.orderId)
            qs.set('order_id', String(params.orderId));
        if (params.orderNumber)
            qs.set('order_number', String(params.orderNumber));
        const path = `${endpoint}?${qs.toString()}`;
        try {
            return await this.request('GET', path, undefined, params.internalOrderId);
        }
        catch (err) {
            this.logger.warn(`Qikink status poll unavailable: ${err.message}`);
            return null;
        }
    }
    async listProducts() {
        const endpoint = this.config.get('qikink.productsEndpoint') || '/api/products';
        return this.request('GET', endpoint);
    }
    async request(method, path, body, orderId, retried = false) {
        const token = await this.getAccessToken();
        const url = `${this.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
        const started = Date.now();
        let statusCode = 0;
        let responseBody = null;
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
            }
            catch {
                responseBody = text;
            }
            if (res.status === 401 && !retried) {
                this.token = null;
                await this.getAccessToken(true);
                return this.request(method, path, body, orderId, true);
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
                requestBody: body,
                responseBody,
                durationMs: Date.now() - started,
            });
            return responseBody;
        }
        catch (err) {
            await this.log({
                direction: 'outbound',
                method,
                path,
                orderId,
                statusCode,
                success: false,
                requestBody: body,
                responseBody,
                error: err.message,
                durationMs: Date.now() - started,
            });
            throw err;
        }
    }
    async log(data) {
        try {
            await this.prisma.qikinkApiLog.create({
                data: {
                    direction: data.direction,
                    method: data.method,
                    path: data.path,
                    orderId: data.orderId,
                    statusCode: data.statusCode,
                    success: data.success,
                    requestBody: data.requestBody ?? undefined,
                    responseBody: data.responseBody ?? undefined,
                    error: data.error,
                    durationMs: data.durationMs,
                },
            });
        }
        catch (err) {
            this.logger.warn(`Failed to write Qikink API log: ${err.message}`);
        }
    }
};
exports.QikinkApiClient = QikinkApiClient;
exports.QikinkApiClient = QikinkApiClient = QikinkApiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], QikinkApiClient);
//# sourceMappingURL=qikink-api.client.js.map