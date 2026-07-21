/**
 * Category card images labeled with the category name.
 * Used by homepage grid and as a fallback when DB imageUrl is empty.
 */
export function categoryImageUrl(name: string, size = 800): string {
  const label = (name || 'Category').trim() || 'Category';
  return `https://placehold.co/${size}x${size}/111111/a78bfa/png?text=${encodeURIComponent(label)}`;
}

export function resolveCategoryImage(
  category: { name: string; imageUrl?: string | null },
  size = 800,
): string {
  const url = (category.imageUrl || '').trim();
  const name = category.name || 'Category';

  if (url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('placehold.co')) {
        const text = u.searchParams.get('text') || '';
        let decoded = text;
        try {
          decoded = decodeURIComponent(text);
        } catch {
          /* keep raw */
        }
        if (!decoded || decoded.toLowerCase() !== name.toLowerCase()) {
          return categoryImageUrl(name, size);
        }
      }
      return url;
    } catch {
      return categoryImageUrl(name, size);
    }
  }

  return categoryImageUrl(name, size);
}
