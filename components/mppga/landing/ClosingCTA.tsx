"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/mppga/ui/button";
import { fadeUp, stagger, viewportOnce } from "./motion";

export function ClosingCTA() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="relative overflow-hidden bg-mppga-teal-deep py-28 text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-mppga-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-mppga-teal/40 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-[1140px] flex-col items-center px-6 text-center">
        <motion.div
          variants={fadeUp}
          className="h-px w-20 bg-gradient-to-r from-transparent via-mppga-gold to-transparent"
        />

        <motion.h2
          variants={fadeUp}
          className="mt-8 font-serif text-4xl tracking-tight md:text-6xl"
        >
          Become a member &mdash; $45/yr.
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-xl text-base leading-relaxed text-white/80"
        >
          Join 100+ Maine groomers who back the standard, share the work, and
          point clients toward each other.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <Button
            href="/join"
            variant="inverse"
            size="lg"
            className="shadow-2xl shadow-mppga-gold/20"
          >
            Join Now
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}
