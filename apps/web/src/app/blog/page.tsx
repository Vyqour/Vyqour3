import Link from 'next/link';
import Image from 'next/image';
import { serverFetch } from '@/lib/server-api';
import type { BlogPost, Paginated } from '@/types';

export const metadata = { title: 'Journal' };

export default async function BlogPage() {
  const res = await serverFetch<Paginated<BlogPost> | { data: BlogPost[] }>('/blog');
  const posts = (res && 'data' in res ? res.data : []) as BlogPost[];

  return (
    <div className="container-px py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Journal</p>
      <h1 className="mt-2 text-3xl font-medium md:text-4xl">Stories & notes</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="group glass-hover overflow-hidden rounded-2xl">
            <div className="relative aspect-[16/10] bg-muted">
              {p.coverImage && (
                <Image src={p.coverImage} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" />
              )}
            </div>
            <div className="p-5">
              <h2 className="font-medium group-hover:text-primary-glow">{p.title}</h2>
              {p.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
      {!posts.length && (
        <p className="mt-10 text-muted-foreground">Journal entries will appear here once the API is connected.</p>
      )}
    </div>
  );
}
