import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import type { MockEvent } from "@/lib/mppga/admin/mockEvents";
import { StatusBadge } from "./StatusBadge";
import { Card } from "./Card";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso)).toUpperCase();
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

export function EventCard({ event }: { event: MockEvent }) {
  const fillPct = Math.min(100, Math.round((event.rsvps / event.capacity) * 100));
  const isDraft = event.status === "Draft";

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
            {formatDate(event.date)}
          </p>
          <h3 className="mt-2 font-serif text-2xl tracking-tight text-mppga-ink">
            {event.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-mppga-ink-soft">
            <MapPin className="h-4 w-4" strokeWidth={1.8} />
            {event.location}
          </p>
        </div>
        <StatusBadge
          label={event.status}
          tone={isDraft ? "muted" : "teal"}
        />
      </div>

      <div className="mt-6 border-t border-mppga-divider pt-5">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Member
            </dt>
            <dd className="mt-1 font-serif text-xl text-mppga-ink">
              {formatPrice(event.memberPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Guest
            </dt>
            <dd className="mt-1 font-serif text-xl text-mppga-ink">
              {formatPrice(event.guestPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              RSVPs
            </dt>
            <dd className="mt-1 font-serif text-xl text-mppga-ink">
              {event.rsvps}/{event.capacity}
            </dd>
          </div>
        </dl>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-mppga-divider">
          <div
            className="h-full rounded-full bg-mppga-teal"
            style={{ width: `${fillPct}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-mppga-divider pt-4">
        <p className="flex items-center gap-1.5 text-sm text-mppga-ink-soft">
          <Users className="h-4 w-4" strokeWidth={1.8} />
          {event.rsvps} confirmed
        </p>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/admin/events/${event.id}/rsvps`}
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            View RSVPs
          </Link>
          <span className="text-mppga-ink-muted">·</span>
          <Link
            href={`/admin/events/${event.id}`}
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            Edit
          </Link>
        </div>
      </div>
    </Card>
  );
}
