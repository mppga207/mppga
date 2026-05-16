import Link from "next/link";
import { MapPin } from "lucide-react";
import type { MockEvent } from "@/lib/mppga/admin/mockEvents";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric" });

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

export function PublicEventCard({ event }: { event: MockEvent }) {
  const start = new Date(event.date);
  const spotsLeft = event.capacity - event.rsvps;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
  const isFull = spotsLeft <= 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-mppga-divider bg-mppga-card transition-colors hover:border-mppga-teal"
    >
      <div className="flex items-stretch gap-5 p-6">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal-deep">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
            {monthFormatter.format(start)}
          </span>
          <span className="font-serif text-2xl leading-none">
            {dayFormatter.format(start)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-serif text-xl text-mppga-ink group-hover:text-mppga-teal-deep">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-mppga-ink-soft">
            {dateFormatter.format(start)} · {timeFormatter.format(start)}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-mppga-ink-soft">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
            {event.location}
          </p>
        </div>
      </div>

      <p className="px-6 pb-6 text-sm leading-relaxed text-mppga-ink-soft">
        {event.description}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-mppga-divider bg-mppga-page px-6 py-4">
        <div className="flex items-baseline gap-1.5 text-sm">
          <span className="font-medium text-mppga-ink">
            {formatPrice(event.memberPrice)}
          </span>
          <span className="text-xs text-mppga-ink-muted">members</span>
          <span className="text-mppga-ink-muted">·</span>
          <span className="font-medium text-mppga-ink">
            {formatPrice(event.guestPrice)}
          </span>
          <span className="text-xs text-mppga-ink-muted">guests</span>
        </div>

        {isFull ? (
          <span className="text-xs font-medium text-mppga-ink-muted">
            Waitlist open
          </span>
        ) : isAlmostFull ? (
          <span className="text-xs font-medium text-mppga-teal">
            {spotsLeft} spots left
          </span>
        ) : (
          <span className="text-xs font-medium text-mppga-teal group-hover:text-mppga-teal-hover">
            View details &rarr;
          </span>
        )}
      </div>
    </Link>
  );
}
