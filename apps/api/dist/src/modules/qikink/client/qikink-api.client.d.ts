import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { QikinkCreateOrderPayload, QikinkCreateOrderResponse, QikinkOrderStatusResponse } from './qikink.types';
export declare class QikinkApiClient {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private token;
    private tokenExpiresAt;
    constructor(config: ConfigService, prisma: PrismaService);
    isEnabled(): boolean;
    getBaseUrl(): string;
    private clientId;
    private clientSecret;
    getAccessToken(force?: boolean): Promise<string>;
    createOrder(payload: QikinkCreateOrderPayload, orderId?: string): Promise<QikinkCreateOrderResponse>;
    getOrderStatus(params: {
        orderId?: string | number;
        orderNumber?: string;
        internalOrderId?: string;
    }): Promise<QikinkOrderStatusResponse | null>;
    listProducts(): Promise<unknown>;
    private request;
    private log;
}
