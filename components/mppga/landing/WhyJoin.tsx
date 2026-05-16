"use client";

import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "./motion";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

type PillarTone = "teal" | "sand";

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
  photoLabel: string;
  tone: PillarTone;
};

const pillars: Pillar[] = [
  {
    icon: Users,
    title: "Community & Support",
    body: "Connecting groomers, salon owners, mobile stylists, educators, and apprentices throughout Maine for collaboration, support, and professional advancement.",
    photoLabel: "Photo · members gathering",
    tone: "teal",
  },
  {
    icon: ShieldCheck,
    title: "Safety & Standards",
    body: "We embrace the PPGSA Standards of Care, Safety and Sanitation — created by grooming professionals to ensure humane practice and clean, safe environments for pets in every salon.",
    photoLabel: "Photo · salon at work",
    tone: "sand",
  },
  {
    icon: GraduationCap,
    title: "Education & Growth",
    body: "We support continuing education, workshops, and professional development that helps Maine groomers stay connected and thrive.",
    photoLabel: "Photo · workshop instruction",
    tone: "teal",
  },
];

export function WhyJoin() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="border-b border-mppga-divider bg-mppga-page py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6">
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-teal">
              What we do
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
              Three pillars.
            </h2>
          </div>
          <div
            aria-hidden
            className="hidden h-px flex-1 bg-gradient-to-l from-transparent via-mppga-gold/40 to-transparent md:block"
          />
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <motion.article
                key={p.title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-mppga-divider bg-mppga-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-mppga-teal/10"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-mppga-teal via-mppga-gold to-mppga-teal opacity-0 transition-opacity group-hover:opacity-100"
                />

                <div className="relative">
                  <PhotoPlaceholder
                    tone={p.tone}
                    label={p.photoLabel}
                    className="aspect-[16/10]"
                    rounded="rounded-none"
                    showIcon={false}
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-7 left-7 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-mppga-teal-tint to-mppga-sand text-mppga-teal-deep shadow-md ring-1 ring-mppga-gold/30"
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-7 pt-12">
                  <h3 className="font-serif text-2xl text-mppga-ink">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                    {p.body}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
