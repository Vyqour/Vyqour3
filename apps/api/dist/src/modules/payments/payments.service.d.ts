import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { QikinkService } from '../qikink/qikink.service';
export declare class PaymentsService {
    private readonly prisma;
    private readonly config;
    private readonly qikink;
    private readonly logger;
    private keyId?;
    private keySecret?;
    private webhookSecret?;
    constructor(prisma: PrismaService, config: ConfigService, qikink: QikinkService);
    createPaymentOrder(orderId: string, userId: string): Promise<{
        message: string;
        orderId: string;
        orderNumber?: undefined;
        razorpayOrderId?: undefined;
        amount?: undefined;
        currency?: undefined;
        keyId?: undefined;
        mock?: undefined;
    } | {
        message: string;
        orderId: string;
        orderNumber: string;
        razorpayOrderId?: undefined;
        amount?: undefined;
        currency?: undefined;
        keyId?: undefined;
        mock?: undefined;
    } | {
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        orderId: string;
        orderNumber: string;
        mock: boolean;
        message?: undefined;
    } | {
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        orderId: string;
        orderNumber: string;
        message?: undefined;
        mock?: undefined;
    }>;
    verifyPayment(payload: {
        orderId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }): Promise<{
        message: string;
        orderId: string;
        orderNumber: string;
        duplicate: boolean;
    } | {
        message: string;
        orderId: string;
        orderNumber: string;
        duplicate?: undefined;
    }>;
    handleRazorpayWebhook(signature: string | undefined, rawBody: Buffer | string | undefined, body: Record<string, unknown>): Promise<{
        ok: boolean;
        duplicate: boolean;
        matched?: undefined;
        ignored?: undefined;
        event?: undefined;
        orderId?: undefined;
    } | {
        ok: boolean;
        matched: boolean;
        duplicate?: undefined;
        ignored?: undefined;
        event?: undefined;
        orderId?: undefined;
    } | {
        ok: boolean;
        ignored: boolean;
        event: string;
        duplicate?: undefined;
        matched?: undefined;
        orderId?: undefined;
    } | {
        ok: boolean;
        matched: boolean;
        orderId: string;
        duplicate?: undefined;
        ignored?: undefined;
        event?: undefined;
    }>;
    private markOrderPaid;
}
