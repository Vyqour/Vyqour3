import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  actionLabel = 'View all',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-glow">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-white"
        >
          {actionLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
