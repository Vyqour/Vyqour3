import { PaymentMethod } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class CreateOrderDto {
    shippingAddressId: string;
    billingAddressId?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
    couponCode?: string;
}
export declare class UpdateOrderStatusDto {
    status: string;
    note?: string;
    trackingNumber?: string;
    carrier?: string;
}
export declare class OrderQueryDto extends PaginationDto {
    status?: string;
}
