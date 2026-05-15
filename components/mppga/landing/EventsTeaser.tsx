"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/mppga/ui/button";
import { fadeUp, stagger, viewportOnce } from "./motion";

type SampleEvent = {
  month: string;
  day: string;
  city: string;
  title: string;
  body: string;
  memberPrice: number;
  guestPrice: number;
};

const events: SampleEvent[] = [
  {
    month: "Jun",
    day: "14",
    city: "Portland, ME",
    title: "Safe Handling Workshop",
    body: "Hands-on session covering restraint, muzzling, and reading stress signals.",
    memberPrice: 20,
    guestPrice: 40,
  },
  {
    month: "Jul",
    day: "09",
    city: "Bangor, ME",
    title: "Hand-Scissoring Clinic",
    body: "Demo + practice cuts on poodle and bichon coats with a certified judge.",
    memberPrice: 35,
    guestPrice: 65,
  },
  {
    month: "Sep",
    day: "21",
    city: "Augusta, ME",
    title: "Annual MPPGA Meeting",
    body: "Year in review, board elections, member dinner, and CEU panel.",
    memberPrice: 0,
    guestPrice: 25,
  },
];

const formatMember = (n: number) => (n === 0 ? "Free" : `$${n}`);

export function EventsTeaser() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={stagger}
      className="border-b border-mppga-divider bg-mppga-sand py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6">
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-teal">
              Events
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
              Upcoming events.
            </h2>
          </div>
          <Link
            href="/events"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-mppga-teal transition-colors hover:text-mppga-teal-hover"
          >
            See all events
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </Link>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {events.map((e) => (
            <motion.article
              key={e.title}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-mppga-divider bg-mppga-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-mppga-teal/10"
            >
              <div className="relative flex h-28 items-center gap-3 bg-mppga-teal-deep px-5">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "radial-gradient(60% 100% at 80% 30%, rgba(201,169,97,0.4), transparent 70%)",
                  }}
                />
                <div className="relative flex flex-col items-center rounded-md bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-mppga-gold-soft">
                    {e.month}
                  </span>
                  <span className="font-serif text-2xl leading-none text-white">
                    {e.day}
                  </span>
                </div>
                <div className="relative flex items-center gap-1.5 text-xs text-white/80">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {e.city}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-serif text-xl leading-snug text-mppga-ink">
                  {e.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                  {e.body}
                </p>
                <p className="mt-4 text-sm text-mppga-ink-soft">
                  Member{" "}
                  <span className="font-medium text-mppga-ink">
                    {formatMember(e.memberPrice)}
                  </span>{" "}
                  &middot; Guest{" "}
                  <span className="font-medium text-mppga-ink">
                    ${e.guestPrice}
                  </span>
                </p>
                <Button
                  href="/events"
                  variant="secondary"
                  className="mt-5 w-fit"
                >
                  RSVP
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
