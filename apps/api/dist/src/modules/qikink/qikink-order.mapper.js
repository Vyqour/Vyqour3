"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQikinkOrderNumber = toQikinkOrderNumber;
exports.paymentMethodToGateway = paymentMethodToGateway;
exports.mapOrderToQikinkPayload = mapOrderToQikinkPayload;
exports.mapQikinkStatusToOrderStatus = mapQikinkStatusToOrderStatus;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
function toQikinkOrderNumber(order) {
    if (order.qikinkOrderNumber && order.qikinkOrderNumber.length <= 15) {
        return order.qikinkOrderNumber;
    }
    const raw = (order.orderNumber || order.id).replace(/[^a-zA-Z0-9]/g, '');
    const compact = `V${raw.slice(-12)}`.slice(0, 15);
    return compact;
}
function paymentMethodToGateway(method) {
    if (method === client_1.PaymentMethod.COD)
        return 'COD';
    return 'Prepaid';
}
function mapOrderToQikinkPayload(order, opts) {
    if (!order.items?.length) {
        throw new common_1.BadRequestException('Order has no items for Qikink');
    }
    const line_items = order.items.map((item) => {
        const product = item.product;
        const variant = item.variant;
        const sku = variant?.qikinkSku ||
            product.qikinkSku ||
            variant?.sku ||
            item.sku ||
            product.sku;
        if (!sku) {
            throw new common_1.BadRequestException(`Missing Qikink SKU for product "${item.productName}". Set product/variant qikinkSku.`);
        }
        const searchFrom = product.qikinkSearchFromMyProducts ?? 1;
        const price = Number(item.unitPrice);
        const line = {
            search_from_my_products: searchFrom,
            quantity: String(item.quantity),
            price: String(price),
            sku,
        };
        if (searchFrom === 0) {
            const designCode = product.qikinkDesignCode || product.slug.slice(0, 40);
            const designUrl = product.qikinkDesignUrl || item.imageUrl || '';
            const mockupUrl = product.qikinkMockupUrl || product.qikinkDesignUrl || item.imageUrl || designUrl;
            if (!designUrl && !product.qikinkDesignCode) {
                throw new common_1.BadRequestException(`Design URL/code required for "${item.productName}" when search_from_my_products=0`);
            }
            line.print_type_id = product.qikinkPrintTypeId || 1;
            line.designs = [
                {
                    design_code: designCode,
                    width_inches: '',
                    height_inches: '',
                    placement_sku: product.qikinkPlacementSku || 'fr',
                    design_link: designUrl,
                    mockup_link: mockupUrl,
                },
            ];
        }
        return line;
    });
    const addr = order.shippingAddress;
    const nameParts = (addr.fullName || order.user.firstName || 'Customer').trim().split(/\s+/);
    const first = nameParts[0] || 'Customer';
    const last = nameParts.slice(1).join(' ') || order.user.lastName || '';
    const payload = {
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
function mapQikinkStatusToOrderStatus(raw) {
    if (!raw)
        return null;
    const s = raw.toLowerCase().replace(/[_\s-]+/g, ' ');
    if (/(cancel|cancelled|canceled|rejected)/.test(s))
        return 'CANCELLED';
    if (/(deliver)/.test(s))
        return 'DELIVERED';
    if (/(out for delivery|ofd)/.test(s))
        return 'OUT_FOR_DELIVERY';
    if (/(ship|dispatch|in transit|awb|picked)/.test(s))
        return 'SHIPPED';
    if (/(print|produc|process|confirm|accepted|new)/.test(s))
        return 'PROCESSING';
    return null;
}
//# sourceMappingURL=qikink-order.mapper.js.map