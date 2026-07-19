import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'sale';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        variant === 'default' && 'bg-primary/20 text-primary-glow',
        variant === 'secondary' && 'bg-white/10 text-white',
        variant === 'outline' && 'border border-white/15 text-muted-foreground',
        variant === 'success' && 'bg-success/20 text-green-400',
        variant === 'sale' && 'bg-red-500/20 text-red-400',
        className,
      )}
      {...props}
    />
  );
}
