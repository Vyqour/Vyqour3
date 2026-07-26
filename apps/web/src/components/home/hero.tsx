'use client';

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
            Vyqour is a modern lifestyle and fashion brand that creates premium clothing and accessories designed to help people express their identity, confidence, and individuality.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg">
              <Link href="/shop">
                Shop Collection <ArrowRight className="h-4 w-4" />
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
              <p className="text-xl font-medium text-white">₹499+</p>
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
          <div className="glass relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-card-shine p-8">
            <div className="flex items-start justify-between">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                SS26 Drop
              </span>
              <span className="text-xs text-primary-glow">VYQOUR</span>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-float rounded-full bg-primary/30 blur-3xl" />
                <p className="relative text-center text-6xl font-semibold tracking-[0.35em] sm:text-7xl">
                  V
                </p>
              </div>
            </div>
            <div>
              <p className="text-lg font-medium">Identity Heavy Hoodie</p>
              <p className="mt-1 text-sm text-muted-foreground">From ₹3,499 · 450 GSM</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
