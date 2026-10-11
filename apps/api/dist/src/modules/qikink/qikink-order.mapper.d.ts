import { Order, OrderItem, Address, Product, ProductVariant, User, PaymentMethod } from '@prisma/client';
import { QikinkCreateOrderPayload, QikinkGateway } from './client/qikink.types';
type OrderForQikink = Order & {
    items: (OrderItem & {
        product: Product;
        variant: ProductVariant | null;
    })[];
    shippingAddress: Address;
    user: Pick<User, 'email' | 'firstName' | 'lastName' | 'phone'>;
};
export declare function toQikinkOrderNumber(order: Order): string;
export declare function paymentMethodToGateway(method: PaymentMethod): QikinkGateway;
export declare function mapOrderToQikinkPayload(order: OrderForQikink, opts: {
    shipping: string;
}): QikinkCreateOrderPayload;
export declare function mapQikinkStatusToOrderStatus(raw?: string | null): 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'CONFIRMED' | null;
export {};
