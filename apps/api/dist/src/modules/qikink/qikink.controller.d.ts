import { Request } from 'express';
import { QikinkService } from './qikink.service';
import { QikinkJobQueue } from './queue/qikink-job.queue';
import { PrismaService } from '../../prisma/prisma.service';
import { MapQikinkSkuDto } from './dto/qikink.dto';
export declare class QikinkController {
    private readonly qikink;
    private readonly queue;
    private readonly prisma;
    constructor(qikink: QikinkService, queue: QikinkJobQueue, prisma: PrismaService);
    webhook(headers: Record<string, string | string[] | undefined>, body: Record<string, unknown>, req: Request & {
        rawBody?: Buffer;
    }): Promise<{
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
    health(): {
        enabled: boolean;
        autoSubmit: boolean;
    };
    submit(orderId: string): Promise<{
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
    retry(orderId: string): Promise<{
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
    fulfillment(orderId: string): Promise<{
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
            result: import("@prisma/client/runtime/library").JsonValue | null;
            type: import(".prisma/client").$Enums.QikinkJobType;
            orderId: string | null;
            payload: import("@prisma/client/runtime/library").JsonValue | null;
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
            payload: import("@prisma/client/runtime/library").JsonValue;
            eventId: string | null;
            eventType: string;
            signatureValid: boolean;
            processed: boolean;
            processedAt: Date | null;
        }[];
    }>;
    syncStatus(orderId: string): Promise<{
        queued: boolean;
        jobId: string;
    }>;
    syncProducts(): Promise<{
        jobId: string;
        result: {
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
        };
    }>;
    catalog(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        category: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal | null;
        qikinkSku: string;
        size: string | null;
        color: string | null;
        raw: import("@prisma/client/runtime/library").JsonValue | null;
        printTypeId: number | null;
        lastSyncedAt: Date;
    }[]>;
    logs(): import(".prisma/client").Prisma.PrismaPromise<{
        error: string | null;
        id: string;
        createdAt: Date;
        orderId: string | null;
        path: string | null;
        requestBody: import("@prisma/client/runtime/library").JsonValue | null;
        success: boolean;
        method: string | null;
        direction: string;
        statusCode: number | null;
        responseBody: import("@prisma/client/runtime/library").JsonValue | null;
        durationMs: number | null;
    }[]>;
    jobs(): import(".prisma/client").Prisma.PrismaPromise<{
        error: string | null;
        id: string;
        status: import(".prisma/client").$Enums.QikinkJobStatus;
        createdAt: Date;
        updatedAt: Date;
        result: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.QikinkJobType;
        orderId: string | null;
        payload: import("@prisma/client/runtime/library").JsonValue | null;
        attempts: number;
        maxAttempts: number;
        runAfter: Date;
        lockedAt: Date | null;
        lockedBy: string | null;
        completedAt: Date | null;
    }[]>;
    mapProduct(productId: string, dto: MapQikinkSkuDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: string;
        status: import(".prisma/client").$Enums.ProductStatus;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string;
        seoTitle: string | null;
        seoDescription: string | null;
        sku: string | null;
        shortDescription: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
        costPrice: import("@prisma/client/runtime/library").Decimal | null;
        barcode: string | null;
        categoryId: string;
        isFeatured: boolean;
        isNewArrival: boolean;
        isBestSeller: boolean;
        isTrending: boolean;
        tags: string[];
        materials: string | null;
        careInstructions: string | null;
        weightGrams: number | null;
        seoKeywords: string[];
        averageRating: number;
        reviewCount: number;
        totalSold: number;
        viewCount: number;
        qikinkSku: string | null;
        qikinkProductId: string | null;
        qikinkPrintTypeId: number;
        qikinkDesignCode: string | null;
        qikinkDesignUrl: string | null;
        qikinkMockupUrl: string | null;
        qikinkPlacementSku: string | null;
        qikinkSearchFromMyProducts: number;
        qikinkSyncedAt: Date | null;
        publishedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    mapVariant(variantId: string, body: {
        qikinkSku?: string;
        qikinkPrice?: number;
    }): import(".prisma/client").Prisma.Prisma__ProductVariantClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        isActive: boolean;
        sku: string;
        compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
        weightGrams: number | null;
        qikinkSku: string | null;
        size: string | null;
        color: string | null;
        colorHex: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        stock: number;
        lowStockAt: number;
        qikinkPrice: import("@prisma/client/runtime/library").Decimal | null;
        productId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
