"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/mppga/ui/button";
import { ease, fadeUp, stagger } from "./motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-mppga-divider bg-mppga-page py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 85% 10%, rgba(201,169,97,0.10), transparent 70%), radial-gradient(45% 60% at 15% 90%, rgba(71,115,118,0.10), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-12 px-6 md:grid-cols-[1.1fr_1fr]">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-mppga-divider bg-white/70 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-mppga-gold" strokeWidth={1.8} />
            Maine Professional Pet Groomers Association
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 font-serif text-5xl leading-[1.02] tracking-tight text-mppga-ink md:text-7xl"
          >
            Maine&rsquo;s professional voice for groomers.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg leading-relaxed text-mppga-ink-soft"
          >
            A statewide nonprofit 501(c)(6) created by and for Maine groomers
            &mdash; built on education, professionalism, safety, and community.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Button
              href="/clients/mppga/join"
              size="lg"
              className="shadow-lg shadow-mppga-teal/20"
            >
              Join Now &mdash; $45/yr
            </Button>
            <Button
              href="/clients/mppga/events"
              variant="ghost"
              size="lg"
              className="group"
            >
              See upcoming events
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
              />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="relative aspect-[4/5] rounded-2xl bg-mppga-teal-tint shadow-2xl shadow-mppga-teal/15 md:aspect-[3/4]"
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(110% 80% at 70% 18%, rgba(71,115,118,0.32), transparent 60%), radial-gradient(80% 60% at 20% 85%, rgba(201,169,97,0.20), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-mppga-gold/30"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full border border-mppga-teal/20"
          />

          <div className="absolute inset-6 flex flex-col rounded-xl border border-white/60 bg-white/40 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mppga-teal font-serif text-xl text-white shadow-md">
              M
            </div>
            <p className="mt-6 max-w-[18ch] font-serif text-2xl leading-snug text-mppga-teal-darker">
              &ldquo;Maine groomers, raising the standard together.&rdquo;
            </p>
            <p className="mt-auto text-[10px] uppercase tracking-[0.18em] text-mppga-ink-muted">
              Photo placeholder &middot; groomer at work
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
