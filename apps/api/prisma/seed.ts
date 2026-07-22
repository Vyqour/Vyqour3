import { PrismaClient, ProductStatus, Role, CouponType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const placeholder = (label: string, w = 800, h = 1000) =>
  `https://placehold.co/${w}x${h}/111111/a78bfa/png?text=${encodeURIComponent(label)}`;

/** Product-style category photos (Unsplash) — used for category cards */
const categoryPhoto = (slugOrName: string, w = 800) => {
  const key = slugOrName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const map: Record<string, string> = {
    't-shirts': 'photo-1521572163474-6864f9cf17ab',
    hoodies: 'photo-1556821840-3a63f95609a7',
    jackets: 'photo-1551028719-00167b16eac5',
    'bottom-wear': 'photo-1624378439575-d8705ad7ae80',
    tops: 'photo-1434389677669-e08b4cac3105',
    dresses: 'photo-1595777457583-95e059d581b8',
    accessories: 'photo-1523170335258-f5ed11844a49',
    clothes: 'photo-1489987707025-afc232f7ea0f',
    clothing: 'photo-1489987707025-afc232f7ea0f',
    caps: 'photo-1588850561407-ed78c282e89b',
    'tote-bags': 'photo-1590874103328-eac38a683ce7',
    drinkware: 'photo-1514228742587-6b1558fcca3d',
    mugs: 'photo-1514228742587-6b1558fcca3d',
    posters: 'photo-1513519245088-0e12902e35ca',
    stickers: 'photo-1611532736597-de2d4265fba3',
    'phone-covers': 'photo-1601784551446-20c9e07cdbdb',
    sweatshirts: 'photo-1578587018452-892bacefd3f2',
    'polo-t-shirts': 'photo-1586790170083-2f9ceadc732d',
  };
  const id = map[key] || 'photo-1441986300917-64674bd600d8';
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
};

async function main() {
  console.log('🌱 Seeding VYQOUR database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vyqour.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'VyqourAdmin@2026';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'VYQOUR',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@vyqour.com' },
    update: {},
    create: {
      email: 'demo@vyqour.com',
      passwordHash: await bcrypt.hash('Demo@1234', 12),
      firstName: 'Aarav',
      lastName: 'Mehta',
      phone: '9876543210',
      role: Role.CUSTOMER,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.address.upsert({
    where: { id: 'seed-address-demo' },
    update: {},
    create: {
      id: 'seed-address-demo',
      userId: demoUser.id,
      fullName: 'Aarav Mehta',
      phone: '9876543210',
      line1: '12, Identity Lane',
      line2: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'India',
      isDefault: true,
    },
  });

  const categoryDefs = [
    { name: 'T-Shirts', slug: 't-shirts', description: 'Premium everyday tees' },
    { name: 'Hoodies', slug: 'hoodies', description: 'Heavyweight comfort' },
    { name: 'Sweatshirts', slug: 'sweatshirts', description: 'Soft layering essentials' },
    { name: 'Polo T-Shirts', slug: 'polo-t-shirts', description: 'Clean collar classics' },
    { name: 'Jackets', slug: 'jackets', description: 'Layered luxury' },
    { name: 'Bottom Wear', slug: 'bottom-wear', description: 'Joggers, cargos & more' },
    { name: 'Tops', slug: 'tops', description: 'Elevated tops' },
    { name: 'Dresses', slug: 'dresses', description: 'Statement silhouettes' },
    { name: 'Accessories', slug: 'accessories', description: 'Finish the look' },
  ];

  const categories: Record<string, string> = {};
  for (const [i, c] of categoryDefs.entries()) {
    const imageUrl = categoryPhoto(c.slug, 800);
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        imageUrl,
        sortOrder: i,
        isActive: true,
      },
      create: {
        ...c,
        imageUrl,
        sortOrder: i,
        isActive: true,
      },
    });
    categories[c.slug] = cat.id;
  }

  const accessoryChildren = [
    'Caps',
    'Tote Bags',
    'Drinkware',
    'Mugs',
    'Mouse Pads',
    'Scarves',
    'Stoles',
    'Scrunchies',
    'Dog Tags',
    'Pendants',
    'Personalized Pens',
    'Posters',
    'Stickers',
    'Phone Covers',
  ];
  for (const [i, name] of accessoryChildren.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const imageUrl = categoryPhoto(slug, 600);
    await prisma.category.upsert({
      where: { slug },
      update: {
        name,
        imageUrl,
        parentId: categories['accessories'],
        sortOrder: i,
        isActive: true,
      },
      create: {
        name,
        slug,
        parentId: categories['accessories'],
        imageUrl,
        sortOrder: i,
        isActive: true,
      },
    });
  }


  const collectionDefs = [
    {
      name: 'Clothes',
      slug: 'clothes',
      description: 'Apparel essentials — tees, hoodies, layers and more',
      imageUrl: categoryPhoto('t-shirts', 900),
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Caps, totes, phone covers and finishing details',
      imageUrl: categoryPhoto('accessories', 900),
    },
  ];
  const collections: Record<string, string> = {};
  for (const [i, c] of collectionDefs.entries()) {
    const row = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        sortOrder: i,
        isActive: true,
      },
      create: {
        ...c,
        sortOrder: i,
        isActive: true,
      },
    });
    collections[c.slug] = row.id;
  }

  type SeedProduct = {
    name: string;
    slug: string;
    category: string;
    collection?: string;
    price: number;
    compare?: number;
    featured?: boolean;
    neu?: boolean;
    best?: boolean;
    trend?: boolean;
    colors: { name: string; hex: string }[];
    sizes: string[];
    tags: string[];
    description: string;
  };

  const products: SeedProduct[] = [
    {
      name: 'Void Core Tee',
      slug: 'void-core-tee',
      category: 't-shirts',
      price: 1299,
      compare: 1799,
      featured: true,
      neu: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Bone', hex: '#E8E4D9' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      tags: ['essential', 'cotton'],
      description:
        'Ultra-soft 240 GSM cotton tee with a boxy luxury fit. Minimal VYQOUR mark at the chest. Built for everyday identity.',
    },
    {
      name: 'Neon Pulse Oversized Tee',
      slug: 'neon-pulse-oversized-tee',
      category: 't-shirts',
      price: 1499,
      compare: 1999,
      trend: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Indigo', hex: '#1E1B4B' },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      tags: ['oversized', 'graphic'],
      description:
        'Dropped shoulder oversized tee with subtle neon pulse graphic. Statement without noise.',
    },
    {
      name: 'Identity Heavy Hoodie',
      slug: 'identity-heavy-hoodie',
      category: 'hoodies',
      price: 3499,
      compare: 4499,
      featured: true,
      best: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Charcoal', hex: '#1F1F1F' },
        { name: 'Violet', hex: '#2E1065' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      tags: ['hoodie', 'winter'],
      description:
        '450 GSM French terry hoodie with brushed interior. Deep kangaroo pocket, matte metal tips, embroidered identity mark.',
    },
    {
      name: 'Shadow Zip Hoodie',
      slug: 'shadow-zip-hoodie',
      category: 'hoodies',
      price: 3799,
      neu: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Olive', hex: '#1A2E1A' },
      ],
      sizes: ['M', 'L', 'XL'],
      tags: ['zip', 'layering'],
      description: 'Full-zip technical hoodie with clean lines and quiet luxury finish.',
    },
    {
      name: 'Aether Bomber',
      slug: 'aether-bomber',
      category: 'jackets',
      price: 5999,
      compare: 7499,
      featured: true,
      trend: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Navy', hex: '#0B132B' },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      tags: ['bomber', 'outerwear'],
      description:
        'Lightweight bomber with satin sheen and ribbed cuffs. Night-ready silhouette for the city.',
    },
    {
      name: 'Urban Utility Jacket',
      slug: 'urban-utility-jacket',
      category: 'jackets',
      price: 6499,
      best: true,
      colors: [{ name: 'Black', hex: '#0B0B0B' }],
      sizes: ['M', 'L', 'XL'],
      tags: ['utility', 'jacket'],
      description: 'Multi-pocket utility jacket in matte technical fabric. Function meets form.',
    },
    {
      name: 'Flux Cargo Pants',
      slug: 'flux-cargo-pants',
      category: 'bottom-wear',
      price: 2999,
      compare: 3699,
      trend: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Stone', hex: '#8A8578' },
      ],
      sizes: ['28', '30', '32', '34', '36'],
      tags: ['cargo', 'pants'],
      description: 'Tapered cargo with hidden zip pockets and articulated knees. Move freely.',
    },
    {
      name: 'Core Jogger',
      slug: 'core-jogger',
      category: 'bottom-wear',
      price: 2499,
      best: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Grey', hex: '#2A2A2A' },
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      tags: ['jogger', 'comfort'],
      description: 'Tapered jogger in heavyweight fleece. Elastic cuff, clean side seam.',
    },
    {
      name: 'Lumen Crop Top',
      slug: 'lumen-crop-top',
      category: 'tops',
      price: 1599,
      neu: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'White', hex: '#F5F5F5' },
      ],
      sizes: ['XS', 'S', 'M', 'L'],
      tags: ['crop', 'top'],
      description: 'Structured crop with soft stretch. Minimal branding, maximal presence.',
    },
    {
      name: 'Noir Slip Dress',
      slug: 'noir-slip-dress',
      category: 'dresses',
      price: 4299,
      featured: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Wine', hex: '#3B0A17' },
      ],
      sizes: ['XS', 'S', 'M', 'L'],
      tags: ['dress', 'evening'],
      description: 'Bias-cut slip dress with adjustable straps. Liquid drape, night energy.',
    },
    {
      name: 'Signal Cap',
      slug: 'signal-cap',
      category: 'accessories',
      price: 899,
      best: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Purple', hex: '#5B21B6' },
      ],
      sizes: ['OS'],
      tags: ['cap', 'accessory'],
      description: 'Structured six-panel cap with tonal VYQOUR embroidery.',
    },
    {
      name: 'Canvas Identity Tote',
      slug: 'canvas-identity-tote',
      category: 'accessories',
      price: 1199,
      neu: true,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Natural', hex: '#D6CDBB' },
      ],
      sizes: ['OS'],
      tags: ['tote', 'bag'],
      description: 'Heavy canvas tote with reinforced handles and interior pocket.',
    },
    {
      name: 'Aura Phone Cover',
      slug: 'aura-phone-cover',
      category: 'accessories',
      price: 699,
      trend: true,
      colors: [
        { name: 'Matte Black', hex: '#0B0B0B' },
        { name: 'Frost', hex: '#E5E7EB' },
      ],
      sizes: ['iPhone 15', 'iPhone 15 Pro', 'Samsung S24'],
      tags: ['phone', 'cover'],
      description: 'Impact-resistant case with subtle aura gradient print.',
    },
    {
      name: 'Steel Dog Tag',
      slug: 'steel-dog-tag',
      category: 'accessories',
      price: 799,
      colors: [{ name: 'Steel', hex: '#9CA3AF' }],
      sizes: ['OS'],
      tags: ['jewelry', 'dog-tag'],
      description: 'Brushed steel dog tag on a black cord. Engrave your identity.',
    },
    {
      name: 'Midnight Stole',
      slug: 'midnight-stole',
      category: 'accessories',
      price: 1499,
      colors: [
        { name: 'Black', hex: '#0B0B0B' },
        { name: 'Violet', hex: '#4C1D95' },
      ],
      sizes: ['OS'],
      tags: ['stole', 'scarf'],
      description: 'Lightweight stole with raw edge finish. Layer it your way.',
    },
    {
      name: 'VYQOUR Sticker Pack',
      slug: 'vyqour-sticker-pack',
      category: 'accessories',
      price: 299,
      neu: true,
      colors: [{ name: 'Mixed', hex: '#5B21B6' }],
      sizes: ['OS'],
      tags: ['sticker', 'pack'],
      description: 'Matte vinyl sticker pack. Laptop, bottle, notebook — claim the surface.',
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const resolvedCollectionId =
      collections[
        p.collection ||
          (p.category === 'accessories' ||
          [
            'caps',
            'tote-bags',
            'drinkware',
            'mugs',
            'mouse-pads',
            'scarves',
            'stoles',
            'scrunchies',
            'dog-tags',
            'pendants',
            'personalized-pens',
            'posters',
            'stickers',
            'phone-covers',
          ].includes(p.category)
            ? 'accessories'
            : 'clothes')
      ] || undefined;
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId: categories[p.category] || existing.categoryId,
          collectionId: resolvedCollectionId ?? existing.collectionId,
        },
      });
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.description.slice(0, 120),
        basePrice: p.price,
        compareAtPrice: p.compare,
        categoryId: categories[p.category],
        collectionId:
          collections[
            p.collection ||
              (p.category === 'accessories' ||
              ['caps','tote-bags','drinkware','mouse-pads','scarves','stoles','scrunchies','dog-tags','pendants','personalized-pens','posters','stickers','phone-covers'].includes(p.category)
                ? 'accessories'
                : 'clothes')
          ] || undefined,
        status: ProductStatus.ACTIVE,
        // Qikink mapping defaults — replace SKUs with your Live "My Products" SKUs
        qikinkSku: undefined,
        qikinkPrintTypeId: p.category === 'accessories' ? 5 : 1,
        qikinkSearchFromMyProducts: 1,
        qikinkPlacementSku: 'fr',
        qikinkDesignCode: p.slug.slice(0, 40),
        isFeatured: !!p.featured,
        isNewArrival: !!p.neu,
        isBestSeller: !!p.best,
        isTrending: !!p.trend,
        tags: p.tags,
        materials: 'Premium cotton / technical blends',
        careInstructions: 'Machine wash cold. Do not bleach. Hang dry.',
        seoTitle: `${p.name} | VYQOUR`,
        seoDescription: p.description.slice(0, 155),
        publishedAt: new Date(),
        averageRating: 4.2 + Math.random() * 0.7,
        reviewCount: Math.floor(Math.random() * 40) + 5,
        totalSold: Math.floor(Math.random() * 200),
        images: {
          create: [0, 1, 2].map((i) => ({
            url: placeholder(p.name, 800, 1000),
            alt: `${p.name} view ${i + 1}`,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        },
        variants: {
          create: p.colors.flatMap((color) =>
            p.sizes.map((size) => {
              const sku = `${p.slug}-${color.name}-${size}`.toUpperCase().replace(/\s+/g, '-');
              return {
                sku,
                size,
                color: color.name,
                colorHex: color.hex,
                stock: 25 + Math.floor(Math.random() * 40),
                price: p.price,
                // Placeholder: set to real Qikink blank SKU (e.g. USs-Wh-M) before Live submit
                qikinkSku: null as string | null,
              };
            }),
          ),
        },
        inventory: {
          create: { quantity: 500, lowStockThreshold: 10 },
        },
      },
    });
    console.log('  +', product.name);
  }

  await prisma.coupon.upsert({
    where: { code: 'VYQOUR10' },
    update: {},
    create: {
      code: 'VYQOUR10',
      description: '10% off your first order',
      type: CouponType.PERCENTAGE,
      value: 10,
      minOrderAmount: 999,
      maxDiscount: 500,
      usageLimit: 1000,
      perUserLimit: 1,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    update: {},
    create: {
      code: 'FREESHIP',
      description: 'Free shipping',
      type: CouponType.FREE_SHIPPING,
      value: 0,
      minOrderAmount: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'IDENTITY500' },
    update: {},
    create: {
      code: 'IDENTITY500',
      description: '₹500 off orders above ₹2999',
      type: CouponType.FIXED,
      value: 500,
      minOrderAmount: 2999,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const posts = [
    {
      title: 'Wear Your Identity: The VYQOUR Manifesto',
      slug: 'wear-your-identity-manifesto',
      excerpt: 'Why we built a brand for those who refuse to blend in.',
      content: `## The beginning

VYQOUR was born from a simple idea: clothing should feel like a signature, not a costume.

## Craft

Every piece is designed in India for a generation that lives online and offline at once — 16 to 30, restless, intentional.

## The drop culture

We release in tight capsules. Less noise. More meaning.

Wear your identity.`,
      tags: ['brand', 'culture'],
    },
    {
      title: 'How to Style Oversized Tees in 2026',
      slug: 'style-oversized-tees-2026',
      excerpt: 'Five clean formulas for the boxy tee.',
      content: `Pair the **Void Core Tee** with Flux Cargos and the Signal Cap for a full monochrome stack.

Or contrast bone cotton against black utilities for quiet tension.

Less is louder.`,
      tags: ['style', 'tees'],
    },
    {
      title: 'Fabric Notes: Why GSM Matters',
      slug: 'fabric-notes-gsm',
      excerpt: 'A quick guide to weight, drape, and durability.',
      content: `240 GSM for tees. 450 GSM for hoodies. Numbers that translate to hand-feel you notice on day one — and day one hundred.`,
      tags: ['fabric', 'quality'],
    },
  ];

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        authorId: admin.id,
        coverImage: placeholder(post.title, 1200, 630),
        isPublished: true,
        publishedAt: new Date(),
        seoTitle: `${post.title} | VYQOUR Journal`,
        seoDescription: post.excerpt,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name: 'VYQOUR',
        tagline: 'Wear Your Identity.',
        currency: 'INR',
        country: 'India',
        freeShippingMin: 1999,
        flatShipping: 99,
        supportEmail: 'support@vyqour.com',
      },
    },
  });

  console.log('✅ Seed complete');
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
  console.log('   Demo:  demo@vyqour.com / Demo@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
