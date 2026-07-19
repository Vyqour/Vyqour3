import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-px flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">404</p>
      <h1 className="mt-3 text-4xl font-medium">Lost in the void</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This page doesn&apos;t exist. Head back to the collection and keep wearing your identity.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
