import { SectionHeader } from '@/components/shared/section-header';

const reviews = [
  {
    name: 'Ishaan K.',
    city: 'Mumbai',
    text: 'The Identity hoodie is unreal. Weight, fit, finish — finally a brand that gets it.',
  },
  {
    name: 'Ananya R.',
    city: 'Bengaluru',
    text: 'Clean packaging, fast delivery, and the Void tee drapes perfectly. Obsessed.',
  },
  {
    name: 'Kabir S.',
    city: 'Delhi',
    text: 'Minimal without being boring. Feels expensive because it is intentional.',
  },
];

export function Reviews() {
  return (
    <section className="container-px section-pad">
      <SectionHeader eyebrow="Social proof" title="Customer love" />
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.map((r) => (
          <blockquote key={r.name} className="glass rounded-2xl p-6">
            <div className="mb-3 text-primary-glow">★★★★★</div>
            <p className="text-sm leading-relaxed text-white/90">&ldquo;{r.text}&rdquo;</p>
            <footer className="mt-4 text-xs text-muted-foreground">
              {r.name} · {r.city}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
