import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Mail,
  MapPin,
} from "lucide-react";

import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import type {
  EventPaymentStatus,
  EventPricingTier,
  EventRegistrationStatus,
} from "@/types/database";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function formatTimeRange(start: Date, end?: Date): string {
  if (!end) return timeFmt.format(start);
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

interface RegistrationView {
  id: string;
  pricePaid: number;
  pricingTier: EventPricingTier;
  paymentStatus: EventPaymentStatus;
  status: EventRegistrationStatus;
}

interface EventView {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Event confirmation · MPPGA`,
    description: `Confirmation for event ${id}.`,
  };
}

export default async function EventConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { session_id } = await searchParams;
  const session = await requireSession(`/events/${id}/confirmation`);

  const supabase = await createClient();

  // RLS ensures the requester can only see their own registration row.
  // Per auth-middleware.md §3.2: 404, not 403, when no row matches.
  const { data: registration } = await supabase
    .from("event_registrations")
    .select(
      "id, event_id, price_paid, pricing_tier, payment_status, status",
    )
    .eq("event_id", id)
    .eq("profile_id", session.user.id)
    .neq("status", "cancelled")
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!registration) {
    notFound();
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title, date, end_date, location, status")
    .eq("id", id)
    .maybeSingle();
  if (!event || event.status !== "published") {
    notFound();
  }

  return (
    <Confirmation
      event={{
        id: event.id,
        title: event.title,
        date: event.date,
        endDate: event.end_date,
        location: event.location,
      }}
      registration={{
        id: registration.id,
        pricePaid: registration.price_paid,
        pricingTier: registration.pricing_tier,
        paymentStatus: registration.payment_status,
        status: registration.status,
      }}
      sessionId={session_id}
    />
  );
}

function Confirmation({
  event,
  registration,
  sessionId,
}: {
  event: EventView;
  registration: RegistrationView;
  sessionId: string | undefined;
}) {
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : undefined;
  const isFree = registration.paymentStatus === "free";
  const isPending = registration.paymentStatus === "pending";
  const isWaitlisted = registration.status === "waitlisted";

  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main className="mx-auto max-w-[860px] px-6 pb-24 pt-12">
        <nav className="mb-8 text-sm text-mppga-ink-muted" aria-label="Breadcrumb">
          <Link href="/events" className="transition-colors hover:text-mppga-teal">
            Events
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/events/${event.id}`}
            className="transition-colors hover:text-mppga-teal"
          >
            {event.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-mppga-ink-soft">Confirmation</span>
        </nav>

        <header className="flex items-start gap-4">
          <span className="mt-1 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-mppga-teal-tint text-mppga-teal">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              {isWaitlisted ? "Waitlisted" : "You’re in"}
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-mppga-ink md:text-5xl">
              {isWaitlisted
                ? `You're on the waitlist for ${event.title}.`
                : `See you at ${event.title}.`}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft md:text-base">
              {isWaitlisted
                ? "We'll email you the moment a spot opens up."
                : isFree
                  ? "Your seat is confirmed. A confirmation email is on its way with everything you need to know."
                  : isPending
                    ? "We received your registration. Payment is still being processed. You'll get a receipt once it clears."
                    : "Your payment went through and your seat is confirmed. A receipt and confirmation email are on the way."}
            </p>
          </div>
        </header>

        <section className="mt-10 rounded-2xl border border-mppga-divider bg-mppga-card p-7 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Event details
          </p>
          <h2 className="mt-3 font-serif text-2xl text-mppga-ink">
            {event.title}
          </h2>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<Calendar className="h-4 w-4" strokeWidth={1.8} />}
              label="Date"
              value={dateFmt.format(start)}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" strokeWidth={1.8} />}
              label="Time"
              value={formatTimeRange(start, end)}
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4" strokeWidth={1.8} />}
              label="Location"
              value={event.location}
            />
            <DetailRow
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />}
              label={isFree ? "Registration" : "Amount"}
              value={
                isFree
                  ? "Free · member"
                  : `${formatPrice(registration.pricePaid)} · ${registration.pricingTier} price`
              }
            />
          </dl>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
              <CalendarPlus className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <h3 className="mt-4 font-serif text-lg text-mppga-ink">
              Add it to your calendar
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mppga-ink-soft">
              Download an ICS file so the event shows up wherever you keep
              your schedule.
            </p>
            <div className="mt-4">
              <Button variant="secondary" disabled>
                Download .ics
              </Button>
            </div>
            <p className="mt-3 text-xs text-mppga-ink-muted">
              Calendar download is being wired up. The confirmation email will
              include the file in the meantime.
            </p>
          </div>

          <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
              <Mail className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <h3 className="mt-4 font-serif text-lg text-mppga-ink">
              Something’s wrong?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mppga-ink-soft">
              Need to cancel, transfer your seat, or change details? Send us a
              note and we’ll take care of it.
            </p>
            <div className="mt-4">
              <Button href="/contact" variant="ghost">
                Contact the board
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-mppga-divider bg-mppga-card p-6 text-sm leading-relaxed text-mppga-ink-soft">
          <p>
            We’ll send a reminder email a couple of days before the event with
            the agenda and what to bring. Your registration also appears in{" "}
            <Link
              href="/dashboard/events"
              className="text-mppga-teal hover:text-mppga-teal-hover"
            >
              your member portal
            </Link>
            .
          </p>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-mppga-divider pt-6 text-sm">
          <Link
            href="/events"
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            ← Back to all events
          </Link>
          {sessionId ? (
            <p className="text-[11px] text-mppga-ink-muted">
              Reference: {sessionId.slice(0, 14)}…
            </p>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-mppga-divider bg-mppga-page p-4">
      <span className="mt-0.5 text-mppga-teal">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-mppga-ink">{value}</dd>
      </div>
    </div>
  );
}
