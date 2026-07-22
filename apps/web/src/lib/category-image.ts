/**
 * Category card images for homepage / collections.
 * Prefer DB imageUrl; otherwise map by slug or name to a product-style photo.
 */

const UNSPLASH = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Canonical product-style images keyed by slug (and common aliases). */
const CATEGORY_IMAGES: Record<string, string> = {
  't-shirts': UNSPLASH('photo-1521572163474-6864f9cf17ab'),
  tshirts: UNSPLASH('photo-1521572163474-6864f9cf17ab'),
  tee: UNSPLASH('photo-1521572163474-6864f9cf17ab'),
  tees: UNSPLASH('photo-1521572163474-6864f9cf17ab'),
  hoodies: UNSPLASH('photo-1556821840-3a63f95609a7'),
  hoodie: UNSPLASH('photo-1556821840-3a63f95609a7'),
  sweatshirts: UNSPLASH('photo-1578587018452-892bacefd3f2'),
  sweatshirt: UNSPLASH('photo-1578587018452-892bacefd3f2'),
  'polo-t-shirts': UNSPLASH('photo-1586790170083-2f9ceadc732d'),
  polo: UNSPLASH('photo-1586790170083-2f9ceadc732d'),
  polos: UNSPLASH('photo-1586790170083-2f9ceadc732d'),
  caps: UNSPLASH('photo-1588850561407-ed78c282e89b'),
  cap: UNSPLASH('photo-1588850561407-ed78c282e89b'),
  hats: UNSPLASH('photo-1588850561407-ed78c282e89b'),
  'tote-bags': UNSPLASH('photo-1590874103328-eac38a683ce7'),
  tote: UNSPLASH('photo-1590874103328-eac38a683ce7'),
  totes: UNSPLASH('photo-1590874103328-eac38a683ce7'),
  'phone-covers': UNSPLASH('photo-1601784551446-20c9e07cdbdb'),
  'phone-cover': UNSPLASH('photo-1601784551446-20c9e07cdbdb'),
  phonecovers: UNSPLASH('photo-1601784551446-20c9e07cdbdb'),
  mugs: UNSPLASH('photo-1514228742587-6b1558fcca3d'),
  mug: UNSPLASH('photo-1514228742587-6b1558fcca3d'),
  drinkware: UNSPLASH('photo-1514228742587-6b1558fcca3d'),
  stickers: UNSPLASH('photo-1611532736597-de2d4265fba3'),
  sticker: UNSPLASH('photo-1611532736597-de2d4265fba3'),
  posters: UNSPLASH('photo-1513519245088-0e12902e35ca'),
  poster: UNSPLASH('photo-1513519245088-0e12902e35ca'),
  jackets: UNSPLASH('photo-1551028719-00167b16eac5'),
  jacket: UNSPLASH('photo-1551028719-00167b16eac5'),
  'bottom-wear': UNSPLASH('photo-1624378439575-d8705ad7ae80'),
  bottoms: UNSPLASH('photo-1624378439575-d8705ad7ae80'),
  tops: UNSPLASH('photo-1434389677669-e08b4cac3105'),
  dresses: UNSPLASH('photo-1595777457583-95e059d581b8'),
  accessories: UNSPLASH('photo-1523170335258-f5ed11844a49'),
  clothes: UNSPLASH('photo-1489987707025-afc232f7ea0f'),
  clothing: UNSPLASH('photo-1489987707025-afc232f7ea0f'),
  apparel: UNSPLASH('photo-1489987707025-afc232f7ea0f'),
};

function normalizeKey(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Resolve a stock photo for a category name or slug. */
export function categoryImageUrl(nameOrSlug: string, size = 800): string {
  const key = normalizeKey(nameOrSlug);
  const base =
    CATEGORY_IMAGES[key] ||
    // try singular / plural-ish
    CATEGORY_IMAGES[key.replace(/s$/, '')] ||
    CATEGORY_IMAGES[`${key}s`] ||
    UNSPLASH('photo-1441986300917-64674bd600d8'); // generic apparel fallback

  if (size && size !== 800) {
    return base.replace(/w=\d+/, `w=${size}`);
  }
  return base;
}

function isBlankOrPlaceholder(url: string, name: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed) return true;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('placehold.co')) {
      // Treat old text placeholders as missing so real photos show
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function resolveCategoryImage(
  category: { name: string; slug?: string | null; imageUrl?: string | null },
  size = 800,
): string {
  const url = (category.imageUrl || '').trim();
  const name = category.name || 'Category';
  const slug = category.slug || '';

  if (url && !isBlankOrPlaceholder(url, name)) {
    return url;
  }

  // Prefer slug mapping, then name
  if (slug) {
    const bySlug = categoryImageUrl(slug, size);
    if (bySlug) return bySlug;
  }
  return categoryImageUrl(name, size);
}
