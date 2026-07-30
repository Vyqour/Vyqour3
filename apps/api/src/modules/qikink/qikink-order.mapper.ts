import { BadRequestException } from '@nestjs/common';
import {
  Order,
  OrderItem,
  Address,
  Product,
  ProductVariant,
  User,
  PaymentMethod,
} from '@prisma/client';
import {
  QikinkCreateOrderPayload,
  QikinkGateway,
  QikinkLineItem,
} from './client/qikink.types';

type OrderForQikink = Order & {
  items: (OrderItem & {
    product: Product;
    variant: ProductVariant | null;
  })[];
  shippingAddress: Address;
  user: Pick<User, 'email' | 'firstName' | 'lastName' | 'phone'>;
};

/**
 * Qikink requires order_number <= 15 characters and unique.
 * Our internal VYQ... numbers can be longer — compress safely.
 */
export function toQikinkOrderNumber(order: Order): string {
  if (order.qikinkOrderNumber && order.qikinkOrderNumber.length <= 15) {
    return order.qikinkOrderNumber;
  }
  // Prefer short deterministic id: V + last 12 of cuid-ish / orderNumber
  const raw = (order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, '');
  const compact = `V${raw.slice(-12)}`.slice(0, 15);
  return compact;
}

export function paymentMethodToGateway(method: PaymentMethod): QikinkGateway {
  if (method === PaymentMethod.COD) return 'COD';
  return 'Prepaid';
}

export function mapOrderToQikinkPayload(
  order: OrderForQikink,
  opts: { shipping: string },
): QikinkCreateOrderPayload {
  if (!order.items?.length) {
    throw new BadRequestException('Order has no items for Qikink');
  }

  const line_items: QikinkLineItem[] = order.items.map((item) => {
    const product = item.product;
    const variant = item.variant;
    const sku =
      variant?.qikinkSku ||
      product.qikinkSku ||
      variant?.sku ||
      item.sku ||
      product.sku;

    if (!sku) {
      throw new BadRequestException(
        `Missing Qikink SKU for product "${item.productName}". Set product/variant qikinkSku.`,
      );
    }

    const searchFrom = product.qikinkSearchFromMyProducts ?? 1;
    const price = Number(item.unitPrice);
    const line: QikinkLineItem = {
      search_from_my_products: searchFrom,
      quantity: String(item.quantity),
      price: String(price),
      sku,
    };

    if (searchFrom === 0) {
      const rawDesigns = Array.isArray(product.qikinkDesigns)
        ? (product.qikinkDesigns as unknown as Array<{
            placement?: string;
            designCode?: string;
            designUrl?: string;
            mockupUrl?: string;
          }>)
        : [];

      const validDesigns = rawDesigns.filter((d) => d && d.designUrl);

      if (!validDesigns.length) {
        throw new BadRequestException(
          `No print-ready design uploaded for "${item.productName}". Add at least one placement (front/back) in the product's Qikink settings.`,
        );
      }

      line.print_type_id = product.qikinkPrintTypeId || 1;
      line.designs = validDesigns.map((d) => ({
        design_code: d.designCode || product.slug.slice(0, 40),
        width_inches: '',
        height_inches: '',
        placement_sku: d.placement || 'fr',
        design_link: d.designUrl!,
        mockup_link: d.mockupUrl || d.designUrl!,
      }));
                                                       }
    return line;
  });

  const addr = order.shippingAddress;
  const nameParts = (addr.fullName || order.user.firstName || 'Customer').trim().split(/\s+/);
  const first = nameParts[0] || 'Customer';
  const last = nameParts.slice(1).join(' ') || order.user.lastName || '';

  const payload: QikinkCreateOrderPayload = {
    order_number: toQikinkOrderNumber(order),
    qikink_shipping: opts.shipping,
    gateway: paymentMethodToGateway(order.paymentMethod),
    total_order_value: String(Number(order.total)),
    line_items,
  };

  if (String(opts.shipping) === '1') {
    payload.shipping_address = {
      first_name: first,
      last_name: last,
      address1: addr.line1,
      address2: addr.line2 || '',
      phone: addr.phone || order.user.phone || '',
      email: order.user.email,
      city: addr.city,
      zip: addr.postalCode,
      province: addr.state,
      country_code: (addr.country || 'India').toUpperCase().startsWith('IN')
        ? 'IN'
        : (addr.country || 'IN').slice(0, 2).toUpperCase(),
    };
  }

  return payload;
}

/** Map free-text Qikink status into our OrderStatus enum values */
export function mapQikinkStatusToOrderStatus(
  raw?: string | null,
): 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'CONFIRMED' | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[_\s-]+/g, ' ');
  if (/(cancel|cancelled|canceled|rejected)/.test(s)) return 'CANCELLED';
  if (/(deliver)/.test(s)) return 'DELIVERED';
  if (/(out for delivery|ofd)/.test(s)) return 'OUT_FOR_DELIVERY';
  if (/(ship|dispatch|in transit|awb|picked)/.test(s)) return 'SHIPPED';
  if (/(print|produc|process|confirm|accepted|new)/.test(s)) return 'PROCESSING';
  return null;
}
