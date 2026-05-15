"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger, viewportOnce } from "./motion";

const objectives = [
  "Promote advancement in all areas of groomer education and best practices.",
  "Encourage professionalism, humane animal care, and high standards in groomer conduct.",
  "Build a strong network of Maine groomers who share knowledge, resources, and opportunities.",
  "Advocate for consistent safety and sanitation practices that protect pets, groomers, and the public.",
];

export function ExistsTo() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="relative overflow-hidden bg-mppga-teal-deep py-24 text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-mppga-gold/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-mppga-teal/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1140px] px-6">
        <motion.div variants={fadeUp}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-gold">
            Our purpose
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-white md:text-5xl">
            MPPGA exists to:
          </h2>
        </motion.div>

        <ul className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-14 md:gap-y-10">
          {objectives.map((text, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className="group flex items-start gap-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-mppga-gold/40 bg-mppga-gold/10 font-serif text-base font-medium text-mppga-gold transition-colors group-hover:border-mppga-gold group-hover:bg-mppga-gold group-hover:text-mppga-teal-darker">
                {i + 1}
              </span>
              <p className="text-base leading-relaxed text-white/90 md:text-lg">
                {text}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
