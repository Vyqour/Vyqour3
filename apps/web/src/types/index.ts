export type Role = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPPORT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  children?: Category[];
  _count?: { products: number };
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  featuredImageUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  _count?: { products: number };
  products?: Product[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  price?: string | number | null;
  stock: number;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  basePrice: string | number;
  compareAtPrice?: string | number | null;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  categoryId?: string;
  tags: string[];
  materials?: string | null;
  careInstructions?: string | null;
  averageRating: number;
  reviewCount: number;
  totalSold: number;
  images: ProductImage[];
  variants: ProductVariant[];
  category?: { id: string; name: string; slug: string };
  collectionId?: string | null;
  collection?: { id: string; name: string; slug: string } | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: Product & { images: ProductImage[] };
  variant?: ProductVariant | null;
}

export interface CartSummary {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  itemCount: number;
  couponCode?: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  summary: CartSummary;
  couponCode?: string | null;
}

export interface Address {
  id: string;
  type: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productName: string;
  variantLabel?: string | null;
  imageUrl?: string | null;
  unitPrice: string | number;
  quantity: number;
  totalPrice: string | number;
  product?: { slug: string };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string | number;
  discountAmount: string | number;
  shippingAmount: string | number;
  taxAmount: string | number;
  total: string | number;
  trackingNumber?: string | null;
  carrier?: string | null;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: Address;
  statusHistory?: { status: string; note?: string; createdAt: string }[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  tags: string[];
  publishedAt?: string | null;
  author?: { firstName: string; lastName?: string | null; avatarUrl?: string | null };
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiSuccess<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}
