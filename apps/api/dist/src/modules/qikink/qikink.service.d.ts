import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { QikinkApiClient } from './client/qikink-api.client';
import { QikinkJobQueue } from './queue/qikink-job.queue';
export declare class QikinkService {
    private readonly prisma;
    private readonly config;
    private readonly client;
    private readonly queue;
    private readonly mail;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, client: QikinkApiClient, queue: QikinkJobQueue, mail: MailService);
    isEnabled(): boolean;
    autoSubmitEnabled(): boolean;
    enqueueOrderSubmission(orderId: string, reason?: string): Promise<{
        queued: boolean;
        reason: string;
        qikinkOrderId?: undefined;
        jobId?: undefined;
    } | {
        queued: boolean;
        reason: string;
        qikinkOrderId: string | null;
        jobId?: undefined;
    } | {
        queued: boolean;
        jobId: string;
        reason?: undefined;
        qikinkOrderId?: undefined;
    }>;
    processSubmitJob(orderId: string): Promise<{
        skipped: boolean;
        qikinkOrderId: string;
        reason?: undefined;
        success?: undefined;
        response?: undefined;
    } | {
        skipped: boolean;
        reason: string;
        qikinkOrderId?: undefined;
        success?: undefined;
        response?: undefined;
    } | {
        success: boolean;
        qikinkOrderId: string;
        response: import("./client/qikink.types").QikinkCreateOrderResponse;
        skipped?: undefined;
        reason?: undefined;
    }>;
    processStatusSync(orderId: string): Promise<{
        orderId: string;
        mapped: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | null;
        status: string | null | undefined;
    } | {
        skipped: boolean;
        reason?: undefined;
    } | {
        skipped: boolean;
        reason: string;
    }>;
    applyFulfillmentUpdate(orderId: string, update: {
        status?: string | null;
        awb?: string | null;
        courier?: string | null;
        raw?: unknown;
        source: string;
    }): Promise<{
        orderId: string;
        mapped: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | null;
        status: string | null | undefined;
    }>;
    handleWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined, body: Record<string, unknown>): Promise<{
        ok: boolean;
        duplicate: boolean;
        matched?: undefined;
        orderId?: undefined;
    } | {
        ok: boolean;
        matched: boolean;
        duplicate?: undefined;
        orderId?: undefined;
    } | {
        ok: boolean;
        matched: boolean;
        orderId: string;
        duplicate?: undefined;
    }>;
    syncProducts(): Promise<{
        success: boolean;
        imported: number;
        note: string | undefined;
        error?: undefined;
        limitation?: undefined;
    } | {
        success: boolean;
        error: string;
        limitation: string;
        imported?: undefined;
        note?: undefined;
    }>;
    getOrderFulfillment(orderId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        qikinkSyncedAt: Date | null;
        orderNumber: string;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        trackingNumber: string | null;
        carrier: string | null;
        qikinkOrderId: string | null;
        qikinkOrderNumber: string | null;
        qikinkStatus: string | null;
        qikinkSyncStatus: import(".prisma/client").$Enums.QikinkSyncStatus;
        qikinkLastError: string | null;
        qikinkAttempts: number;
        qikinkAwb: string | null;
        qikinkCourier: string | null;
        qikinkJobs: {
            error: string | null;
            id: string;
            status: import(".prisma/client").$Enums.QikinkJobStatus;
            createdAt: Date;
            updatedAt: Date;
            result: Prisma.JsonValue | null;
            type: import(".prisma/client").$Enums.QikinkJobType;
            orderId: string | null;
            payload: Prisma.JsonValue | null;
            attempts: number;
            maxAttempts: number;
            runAfter: Date;
            lockedAt: Date | null;
            lockedBy: string | null;
            completedAt: Date | null;
        }[];
        qikinkEvents: {
            error: string | null;
            id: string;
            createdAt: Date;
            orderId: string | null;
            qikinkOrderId: string | null;
            payload: Prisma.JsonValue;
            eventId: string | null;
            eventType: string;
            signatureValid: boolean;
            processed: boolean;
            processedAt: Date | null;
        }[];
    }>;
    adminRetry(orderId: string): Promise<{
        queued: boolean;
        reason: string;
        qikinkOrderId?: undefined;
        jobId?: undefined;
    } | {
        queued: boolean;
        reason: string;
        qikinkOrderId: string | null;
        jobId?: undefined;
    } | {
        queued: boolean;
        jobId: string;
        reason?: undefined;
        qikinkOrderId?: undefined;
    } | {
        message: string;
        qikinkOrderId: string;
    }>;
}
