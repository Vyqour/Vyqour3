import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
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
    product: Product & { category?: { slug?: string; name?: string } };
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
  const existing = (order.qikinkOrderNumber || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (existing && existing.length <= 15) return existing;

  // Keep the provider's 15-character alphanumeric limit while retaining a
  // deterministic suffix derived from the internal order id to reduce collisions.
  const raw = (order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, '');
  const suffix = createHash('sha256').update(order.id).digest('hex').slice(0, 4).toUpperCase();
  return `V${raw.slice(-10)}${suffix}`.slice(0, 15);
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
    const hasVariant = Boolean(item.variantId || variant);

    let sku: string | undefined;

    if (hasVariant) {
      sku = variant?.qikinkSku?.trim();
      if (!sku) {
        const vSkuStr = variant?.sku || item.sku || 'N/A';
        throw new BadRequestException(
          `Missing Qikink SKU for variant "${vSkuStr}" of product "${item.productName}". Set variant qikinkSku in the admin editor.`,
        );
      }
    } else {
      sku = product.qikinkSku?.trim();
      if (!sku) {
        throw new BadRequestException(
          `Missing Qikink SKU for product "${item.productName}". Set product qikinkSku in the admin editor.`,
        );
      }
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
            placementSku?: string;
            designCode?: string;
            widthInches?: number;
            heightInches?: number;
            designUrl?: string;
            mockupUrl?: string;
          }>)
        : [];

      const validDesigns = rawDesigns.filter((d) => d && d.designUrl?.trim());

      if (!validDesigns.length) {
        throw new BadRequestException(
          `No print-ready design uploaded for "${item.productName}". Add at least one placement in the product's Qikink settings.`,
        );
      }

      line.print_type_id = product.qikinkPrintTypeId || 1;

      const catSlug = product.category?.slug?.toLowerCase() || '';
      const catName = product.category?.name?.toLowerCase() || '';
      const isAccessoryOrAop =
        catSlug.includes('accessory') ||
        catSlug.includes('accessories') ||
        catSlug.includes('aop') ||
        catName.includes('accessory') ||
        catName.includes('accessories') ||
        catName.includes('all over print');

      line.designs = validDesigns.map((d) => {
        const designCode = d.designCode?.trim();
        if (!designCode) {
          throw new BadRequestException(
            `Missing design_code for design placement in product "${item.productName}". Set a design_code (max 15 chars) in the product editor.`,
          );
        }
        if (designCode.length > 20) {
          throw new BadRequestException(
            `Qikink design_code for product "${item.productName}" exceeds maximum 20 characters ("${designCode}").`,
          );
        }

        const placementSku = d.placementSku?.trim();
        if (!placementSku) {
          throw new BadRequestException(
            `Missing placement_sku for design placement in product "${item.productName}". Set a placement_sku in the product editor.`,
          );
        }

        if (!isAccessoryOrAop) {
          if (d.widthInches == null || Number(d.widthInches) <= 0) {
            throw new BadRequestException(
              `Width (inches) is required and must be > 0 for design placement in product "${item.productName}".`,
            );
          }
          if (d.heightInches == null || Number(d.heightInches) <= 0) {
            throw new BadRequestException(
              `Height (inches) is required and must be > 0 for design placement in product "${item.productName}".`,
            );
          }
        }

        return {
          design_code: designCode,
          width_inches: d.widthInches != null && Number(d.widthInches) > 0 ? String(d.widthInches) : '',
          height_inches: d.heightInches != null && Number(d.heightInches) > 0 ? String(d.heightInches) : '',
          placement_sku: placementSku,
          design_link: d.designUrl!.trim(),
          mockup_link: (d.mockupUrl || d.designUrl!).trim(),
        };
      });
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
    const addressLine1 = (addr.line1 || '').trim();
    const address1 = addressLine1.slice(0, 90);
    const overflow = addressLine1.slice(90).trim();
    const address2 = [overflow, addr.line2?.trim()].filter(Boolean).join(' ').slice(0, 180);
    payload.shipping_address = {
      first_name: first,
      last_name: last,
      address1,
      address2,
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
): 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'CONFIRMED' | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  if (/(hold|on hold)/.test(s)) return null;
  if (/(cancel|cancelled|canceled|rejected)/.test(s)) return 'CANCELLED';
  if (/^returned$/.test(s)) return 'RETURNED';
  if (/deliver/.test(s)) return 'DELIVERED';
  if (/(out for delivery|ofd)/.test(s)) return 'OUT_FOR_DELIVERY';
  if (/(in transit|shipped|picked up)/.test(s)) return 'SHIPPED';
  if (/dispatch ready/.test(s)) return 'PROCESSING';
  // Qikink's Live, Live OOS, To be Printed, Partially Picklisted,
  // Printed and Manifested states are pre-delivery fulfilment states.
  if (/(live|to be printed|picklist|printed|manifested|process|produc|confirm|accepted|new)/.test(s)) {
    return 'PROCESSING';
  }
  return null;
}
