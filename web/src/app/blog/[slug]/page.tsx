import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { serverFetch } from '@/lib/server-api';
import type { BlogPost } from '@/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await serverFetch<BlogPost>(`/blog/${slug}`);
  if (!post) return { title: 'Journal' };
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await serverFetch<BlogPost>(`/blog/${slug}`);
  if (!post) notFound();

  return (
    <article className="container-px py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">Journal</p>
        <h1 className="mt-3 text-3xl font-medium md:text-5xl">{post.title}</h1>
        {post.author && (
          <p className="mt-4 text-sm text-muted-foreground">
            By {post.author.firstName} {post.author.lastName || ''}
            {post.publishedAt &&
              ` · ${new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
        )}
        {post.coverImage && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl">
            <Image src={post.coverImage} alt="" fill className="object-cover" priority sizes="800px" />
          </div>
        )}
        <div className="prose-invert-custom mt-10 whitespace-pre-line text-muted-foreground">
          {post.content}
        </div>
      </div>
    </article>
  );
}
