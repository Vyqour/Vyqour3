import { SectionHeader } from '@/components/shared/section-header';

const tiles = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  label: ['Street', 'Studio', 'Detail', 'Fit', 'Night', 'Drop'][i],
}));

export function InstagramGallery() {
  return (
    <section className="container-px section-pad">
      <SectionHeader
        eyebrow="@vyqour"
        title="On the feed"
        description="Tag us wearing your identity."
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {tiles.map((t) => (
          <div
            key={t.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-primary/10"
          >
            <div className="absolute inset-0 flex items-center justify-center text-sm tracking-[0.2em] text-white/40 transition group-hover:text-white/70">
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
