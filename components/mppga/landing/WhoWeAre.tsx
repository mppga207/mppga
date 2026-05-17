"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "./motion";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

export function WhoWeAre() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="relative border-b border-mppga-divider bg-mppga-sand py-24"
    >
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-12 px-6 md:grid-cols-[1fr_1.15fr] md:gap-14">
        <motion.div variants={fadeUp} className="flex flex-col">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-teal">
            Who we are
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
            Built by Maine groomers, for Maine groomers.
          </h2>
          <div className="mt-6 h-px w-16 bg-mppga-gold" />

          <motion.div variants={fadeUp} className="relative mt-10">
            <PhotoPlaceholder
              tone="sand"
              label="Photo placeholder · Maine grooming team"
              className="aspect-[4/5] shadow-xl shadow-mppga-teal/10 md:aspect-[3/4]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-6 hidden h-28 w-28 rounded-full border border-mppga-gold/40 md:block"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-4 -top-4 hidden h-20 w-20 rounded-full border border-mppga-teal/20 md:block"
            />
          </motion.div>
        </motion.div>

        <div className="space-y-6">
          <motion.p
            variants={fadeUp}
            className="text-base leading-relaxed text-mppga-ink-soft"
          >
            The Maine Professional Pet Groomers Association (MPPGA) is a
            growing statewide organization created by and for professional pet
            groomers in Maine. We&rsquo;re being established as a nonprofit
            501(c)(6) professional association: a membership-based
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

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <PhotoPlaceholder
              tone="teal"
              label="Photo · grooming detail"
              className="aspect-[4/3] shadow-sm"
              rounded="rounded-xl"
            />
            <PhotoPlaceholder
              tone="sand"
              label="Photo · workshop in session"
              className="aspect-[4/3] shadow-sm"
              rounded="rounded-xl"
            />
          </motion.div>

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
