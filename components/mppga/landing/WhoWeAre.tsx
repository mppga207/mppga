"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "./motion";

export function WhoWeAre() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="relative border-b border-mppga-divider bg-mppga-sand py-24"
    >
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-14 px-6 md:grid-cols-[1fr_1.25fr]">
        <motion.div variants={fadeUp}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-teal">
            Who we are
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
            Built by Maine groomers, for Maine groomers.
          </h2>
          <div className="mt-6 h-px w-16 bg-mppga-gold" />
        </motion.div>

        <div className="space-y-6">
          <motion.p
            variants={fadeUp}
            className="text-base leading-relaxed text-mppga-ink-soft"
          >
            The Maine Professional Pet Groomers Association (MPPGA) is a
            growing statewide organization created by and for professional pet
            groomers in Maine. We&rsquo;re being established as a nonprofit
            501(c)(6) professional association &mdash; a membership-based
            nonprofit devoted to promoting the common business interests of
            professional groomers and enhancing the standards of the grooming
            industry.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-base leading-relaxed text-mppga-ink-soft"
          >
            MPPGA brings together salon owners, mobile stylists, apprentices,
            educators, and experienced professionals to strengthen the craft
            of pet grooming in Maine and promote growth in the industry for
            years to come.
          </motion.p>

          <motion.blockquote
            variants={fadeUp}
            className="relative rounded-lg border border-mppga-gold/30 bg-white/60 p-6 font-serif text-lg italic leading-relaxed text-mppga-teal-darker shadow-sm"
          >
            <span
              aria-hidden
              className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-mppga-gold p-1.5 text-white shadow"
            >
              <Quote className="h-full w-full" strokeWidth={2} />
            </span>
            Our mission is to support and elevate the grooming profession by
            fostering education, professionalism, safety, and community among
            groomers across the state.
          </motion.blockquote>
        </div>
      </div>
    </motion.section>
  );
}
