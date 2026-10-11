import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class VerifyPaymentDto {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    create(user: AuthUser, orderId: string): Promise<{
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
    verify(dto: VerifyPaymentDto): Promise<{
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
    razorpayWebhook(signature: string, body: Record<string, unknown>, req: Request & {
        rawBody?: Buffer;
    }): Promise<{
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
}
export {};
