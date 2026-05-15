"use client";

import { motion } from "framer-motion";
import { CountUp } from "./CountUp";
import { fadeUp, stagger, viewportOnce } from "./motion";

type Stat = {
  value: string;
  suffix?: string;
  label: string;
};

const stats: Stat[] = [
  { value: "127", suffix: "+", label: "Maine groomers" },
  { value: "16", label: "Counties served" },
  { value: "12", label: "Events per year" },
  { value: "501(c)(6)", label: "Nonprofit status" },
];

const isNumeric = (v: string) => /^\d+$/.test(v);

export function Stats() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="relative border-b border-mppga-divider bg-mppga-page py-14"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mppga-gold/40 to-transparent"
      />

      <div className="mx-auto max-w-[1140px] px-6">
        <motion.p
          variants={fadeUp}
          className="text-center text-xs font-medium uppercase tracking-[0.18em] text-mppga-teal"
        >
          By the numbers
        </motion.p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="flex flex-col items-center text-center"
            >
              <dt className="order-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
                {s.label}
              </dt>
              <dd className="order-1 font-serif text-4xl leading-none tracking-tight text-mppga-teal-deep sm:text-5xl">
                {isNumeric(s.value) ? <CountUp to={Number(s.value)} /> : s.value}
                {s.suffix ? (
                  <span className="text-mppga-gold">{s.suffix}</span>
                ) : null}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </motion.section>
  );
}
