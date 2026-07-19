import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { Product } from '@/types';
import { ProductDetail } from './product-detail';
import { ProductRail } from '@/components/home/product-rail';
import { absoluteUrl } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await serverFetch<Product>(`/products/${slug}`);
  if (!product) return { title: 'Product' };
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || product.description.slice(0, 155),
    openGraph: {
      title: product.name,
      description: product.shortDescription || undefined,
      images: product.images?.[0]?.url ? [product.images[0].url] : [],
      url: absoluteUrl(`/product/${product.slug}`),
    },
    alternates: { canonical: absoluteUrl(`/product/${product.slug}`) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await serverFetch<Product>(`/products/${slug}`);
  if (!product) notFound();
  const related = (await serverFetch<Product[]>(`/products/${product.id}/related`)) || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.map((i) => i.url),
    sku: product.variants?.[0]?.sku,
    brand: { '@type': 'Brand', name: 'VYQOUR' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: Number(product.basePrice),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/product/${product.slug}`),
    },
    aggregateRating: product.reviewCount
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.averageRating,
          reviewCount: product.reviewCount,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
      <ProductRail title="You may also like" products={related} href="/shop" />
    </>
  );
}
