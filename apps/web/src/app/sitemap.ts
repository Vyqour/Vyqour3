import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/shop',
    '/collections',
    '/accessories',
    '/about',
    '/contact',
    '/blog',
    '/faq',
    '/privacy',
    '/terms',
    '/refund',
    '/shipping-policy',
    '/track-order',
  ];
  return routes.map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/shop' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));
}
