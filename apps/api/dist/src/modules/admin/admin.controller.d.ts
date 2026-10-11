import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly admin;
    constructor(admin: AdminService);
    dashboard(): Promise<{
        kpis: {
            totalOrders: number;
            ordersToday: number;
            ordersMonth: number;
            totalRevenue: number;
            revenueMonth: number;
            customers: number;
            activeProducts: number;
            lowStockVariants: number;
        };
        statusBreakdown: {
            status: import(".prisma/client").$Enums.OrderStatus;
            count: number;
        }[];
        revenueSeries: {
            date: string;
            revenue: number;
            orders: number;
        }[];
        recentOrders: ({
            user: {
                email: string;
                firstName: string;
            };
            items: {
                id: string;
                imageUrl: string | null;
                sku: string | null;
                productName: string;
                variantLabel: string | null;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                quantity: number;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                orderId: string;
                productId: string;
                variantId: string | null;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            qikinkSyncedAt: Date | null;
            total: import("@prisma/client/runtime/library").Decimal;
            couponCode: string | null;
            orderNumber: string;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            shippingAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            shippingAddressId: string;
            billingAddressId: string | null;
            notes: string | null;
            trackingNumber: string | null;
            carrier: string | null;
            estimatedDelivery: Date | null;
            shippedAt: Date | null;
            deliveredAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            paymentId: string | null;
            paymentGatewayRef: string | null;
            invoiceUrl: string | null;
            qikinkOrderId: string | null;
            qikinkOrderNumber: string | null;
            qikinkStatus: string | null;
            qikinkSyncStatus: import(".prisma/client").$Enums.QikinkSyncStatus;
            qikinkLastError: string | null;
            qikinkAttempts: number;
            qikinkPayload: import("@prisma/client/runtime/library").JsonValue | null;
            qikinkResponse: import("@prisma/client/runtime/library").JsonValue | null;
            qikinkAwb: string | null;
            qikinkCourier: string | null;
            qikinkShippedAt: Date | null;
            qikinkIdempotencyKey: string | null;
        })[];
    }>;
}
