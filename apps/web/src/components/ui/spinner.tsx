import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-primary',
        className,
      )}
    />
  );
}
