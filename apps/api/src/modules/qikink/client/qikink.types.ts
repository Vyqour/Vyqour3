export type QikinkGateway = 'COD' | 'Prepaid' | 'PREPAID';

export interface QikinkDesign {
  design_code: string;
  width_inches?: string | number;
  height_inches?: string | number;
  placement_sku?: string;
  design_link?: string;
  design_url?: string;
  mockup_link?: string;
  mockup_url?: string;
}

export interface QikinkLineItem {
  search_from_my_products: 0 | 1 | number;
  quantity: string | number;
  price: string | number;
  sku: string;
  print_type_id?: number;
  designs?: QikinkDesign[];
}

export interface QikinkShippingAddress {
  first_name: string;
  last_name?: string;
  address1: string;
  address2?: string;
  phone: string;
  email: string;
  city: string;
  zip: string;
  province: string;
  country_code: string;
}

export interface QikinkCreateOrderPayload {
  order_number: string;
  qikink_shipping: string | number;
  gateway: QikinkGateway;
  total_order_value: string | number;
  line_items: QikinkLineItem[];
  shipping_address?: QikinkShippingAddress;
}

export interface QikinkCreateOrderResponse {
  message?: string;
  order_id?: string | number;
  status_code?: string | number;
  error?: string | string[] | Record<string, unknown>;
  [key: string]: unknown;
}

export interface QikinkTokenResponse {
  ClientId?: string | number;
  Accesstoken?: string;
  AccessToken?: string;
  access_token?: string;
  expires_in?: number | string;
  [key: string]: unknown;
}

export interface QikinkOrderStatusResponse {
  order_id?: string | number;
  order_number?: string;
  status?: string;
  order_status?: string;
  awb?: string;
  tracking_number?: string;
  courier?: string;
  carrier?: string;
  [key: string]: unknown;
}
