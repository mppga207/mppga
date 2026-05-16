import { CalendarDays, MapPin } from "lucide-react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { requireSession } from "@/lib/supabase/session";
import {
  loadMemberRegistrations,
  type MemberRegistration,
} from "@/lib/mppga/portal/data";
import type { EventPaymentStatus } from "@/types/database";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatPrice(cents: number, status: EventPaymentStatus): string {
  if (status === "free" || cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function paymentTone(
  status: EventPaymentStatus,
): "teal" | "neutral" | "warn" | "muted" {
  switch (status) {
    case "paid":
    case "free":
      return "teal";
    case "pending":
      return "warn";
    case "refunded":
      return "muted";
  }
}

export default async function MyEventsPage() {
  const session = await requireSession("/dashboard/events");
  const registrations = await loadMemberRegistrations(session);

  const now = Date.now();
  const upcoming = registrations.filter(
    (r) => new Date(r.eventDateISO).getTime() >= now,
  );
  const past = registrations.filter(
    (r) => new Date(r.eventDateISO).getTime() < now,
  );

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your events"
        description="Workshops, clinics, and mixers you're registered for — plus everything you've already attended."
        actions={
          <Button href="/events" variant="primary">
            Browse events
          </Button>
        }
      />

      <Card
        title="Upcoming"
        description={`${upcoming.length} ${upcoming.length === 1 ? "registration" : "registrations"}`}
      >
        {upcoming.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
            You haven&rsquo;t signed up for anything yet.
          </div>
        ) : (
          <ul className="divide-y divide-mppga-divider">
            {upcoming.map((reg) => (
              <RegistrationRow key={reg.id} registration={reg} />
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Past events"
        description="A record of what you've attended."
      >
        {past.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
            No past events yet.
          </div>
        ) : (
          <ul className="divide-y divide-mppga-divider">
            {past.map((reg) => (
              <RegistrationRow key={reg.id} registration={reg} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RegistrationRow({ registration }: { registration: MemberRegistration }) {
  const waitlisted = registration.registrationStatus === "waitlisted";

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
      <div className="min-w-0">
        <p className="font-serif text-lg text-mppga-ink">
          {registration.eventTitle}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-mppga-ink-soft">
          <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
          {dateFmt.format(new Date(registration.eventDateISO))}
          <span className="text-mppga-ink-muted">·</span>
          <MapPin className="h-4 w-4" strokeWidth={1.8} />
          {registration.location}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 text-right text-sm">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge
            label={
              waitlisted
                ? `Waitlist #${registration.waitlistPosition}`
                : registration.registrationStatus === "confirmed"
                  ? "Confirmed"
                  : "Cancelled"
            }
            tone={
              waitlisted
                ? "warn"
                : registration.registrationStatus === "confirmed"
                  ? "teal"
                  : "muted"
            }
          />
          <StatusBadge
            label={
              registration.paymentStatus === "pending"
                ? "Payment pending"
                : formatPrice(registration.pricePaidCents, registration.paymentStatus)
            }
            tone={paymentTone(registration.paymentStatus)}
          />
        </div>
        <p className="text-xs text-mppga-ink-muted">
          {registration.pricingTier === "member"
            ? "Member pricing"
            : "Guest pricing"}
        </p>
      </div>
    </li>
  );
}
