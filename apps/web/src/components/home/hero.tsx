'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-[100px]" />

      <div className="container-px relative grid min-h-[88vh] items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow"
          >
            Modern Fashion & Lifestyle Brand · India
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Wear Your
            <br />
            <span className="text-gradient">Identity.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground"
          >
            Wear what feels like you. From everyday favourites to standout pieces, VYQOUR is made for your style, your confidence, and your story.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg">
              <Link href="/shop">
                Find Your Style <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/collections">Explore Drops</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex gap-8 text-sm text-muted-foreground"
          >
            <div>
              <p className="text-xl font-medium text-white">240–450</p>
              <p>GSM fabrics</p>
            </div>
            <div>
              <p className="text-xl font-medium text-white">499+</p>
              <p>Free shipping</p>
            </div>
            <div>
              <p className="text-xl font-medium text-white">COD</p>
              <p>Available</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="relative mx-auto aspect-[4/5] w-full max-w-md"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/40 via-transparent to-secondary/30 blur-2xl" />
          <div className="glass relative h-full overflow-hidden rounded-[2rem] bg-card-shine">
            <Image
              src="https://images.unsplash.com/photo-1499972777470-6a932ea55420?auto=format&fit=crop&w=1200&q=85"
              alt="Black streetwear hoodie editorial photograph"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 448px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/80" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6 sm:p-8">
              <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-wider text-white backdrop-blur-sm">
                SS26 Drop
              </span>
              <span className="bg-primary/80 px-2 py-1 text-xs font-medium tracking-wide text-white">
                VYQOUR
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/75">
                Wear Your Identity
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Identity Heavy Hoodie
              </h2>
              <p className="mt-2 text-sm text-white/80">450 GSM · Built for your style</p>
              <Link
                href="/shop"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white underline decoration-white/60 underline-offset-4 transition hover:decoration-white"
              >
                Explore the drop <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
