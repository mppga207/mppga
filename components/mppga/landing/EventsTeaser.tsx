"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/mppga/ui/button";
import { mockEvents } from "@/lib/mppga/admin/mockEvents";
import { fadeUp, stagger, viewportOnce } from "./motion";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-US", { day: "2-digit" });

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function pickTeaserEvents() {
  const now = Date.now();
  return mockEvents
    .filter(
      (e) => e.status === "Published" && new Date(e.date).getTime() >= now,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
}

export function EventsTeaser() {
  const events = pickTeaserEvents();

  if (events.length === 0) return null;

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
          {events.map((event, i) => {
            const start = new Date(event.date);
            const tone = i % 2 === 0 ? "deep" : "teal";
            return (
              <motion.article
                key={event.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-mppga-divider bg-mppga-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-mppga-teal/10"
              >
                <Link
                  href={`/events/${event.id}`}
                  className="relative block"
                  aria-label={event.title}
                >
                  <PhotoPlaceholder
                    tone={tone}
                    label={`Photo · ${event.location}`}
                    className="aspect-[16/10]"
                    rounded="rounded-none"
                    showIcon={false}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                  <div className="absolute left-5 top-5 flex flex-col items-center rounded-md bg-white/95 px-3 py-2 shadow-md ring-1 ring-mppga-divider">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-mppga-teal">
                      {monthFmt.format(start)}
                    </span>
                    <span className="font-serif text-2xl leading-none text-mppga-teal-darker">
                      {dayFmt.format(start)}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-center gap-1.5 text-xs text-white drop-shadow">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {event.location}
                  </div>
                </Link>

                <div className="flex flex-1 flex-col p-6">
                  <Link href={`/events/${event.id}`} className="group/title">
                    <h3 className="font-serif text-xl leading-snug text-mppga-ink group-hover/title:text-mppga-teal-deep">
                      {event.title}
                    </h3>
                  </Link>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-mppga-ink-soft">
                    {event.description}
                  </p>
                  <p className="mt-4 text-sm text-mppga-ink-soft">
                    Member{" "}
                    <span className="font-medium text-mppga-ink">
                      {formatPrice(event.memberPrice)}
                    </span>{" "}
                    &middot; Guest{" "}
                    <span className="font-medium text-mppga-ink">
                      {formatPrice(event.guestPrice)}
                    </span>
                  </p>
                  <Button
                    href={`/events/${event.id}`}
                    variant="secondary"
                    className="mt-5 w-fit"
                  >
                    View details
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
