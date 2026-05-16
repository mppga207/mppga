import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { mockEvents } from "@/lib/mppga/admin/mockEvents";

type PageProps = {
  params: Promise<{ id: string }>;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) return { title: "Registrations · Admin · MPPGA" };
  return { title: `Registrations · ${event.title} · Admin · MPPGA` };
}

export default async function AdminEventRsvpsPage({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) notFound();

  // Per events.md §3 admin sees both confirmed and waitlisted registrations
  // and can cancel any of them. Counts are illustrative until the
  // event_registrations join is wired.
  const confirmedCount = event.rsvps;
  const waitlistedCount = 0;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/admin/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to {event.title}
        </Link>
      </div>

      <AdminPageHeader
        title="Registrations"
        description={`${event.title} · ${dateFmt.format(new Date(event.date))} · ${event.location}`}
        actions={
          <Button variant="secondary" disabled>
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <CountCard
          label="Capacity"
          value={String(event.capacity)}
          note="Hard cap"
        />
        <CountCard
          label="Confirmed"
          value={String(confirmedCount)}
          note={`${Math.round((confirmedCount / event.capacity) * 100)}% full`}
        />
        <CountCard
          label="Waitlisted"
          value={String(waitlistedCount)}
          note="Auto-promoted on cancellations"
        />
      </div>

      <Card
        title="Confirmed"
        description="Sorted by registration date. Cancel from the row menu once wired."
      >
        <div className="grid grid-cols-[1fr_120px_120px_140px] border-b border-mppga-divider bg-mppga-page px-6 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          <span>Member</span>
          <span>Pricing</span>
          <span>Payment</span>
          <span>Registered</span>
        </div>
        <div className="px-6 py-16 text-center">
          <p className="font-serif text-lg text-mppga-ink">
            Confirmed registrations will appear here.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mppga-ink-soft">
            Member name, pricing tier, payment status, and registration date.
            Per events.md §3, you&rsquo;ll be able to cancel any row and the
            waitlist will auto-promote the next person.
          </p>
        </div>
      </Card>

      <Card
        title="Waitlist"
        description="Order is preserved by position. Promotion happens automatically when a confirmed registration cancels."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          No one is on the waitlist yet.
        </div>
      </Card>
    </div>
  );
}

function CountCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl tracking-tight text-mppga-teal-deep">
        {value}
      </p>
      <p className="mt-2 text-xs text-mppga-ink-soft">{note}</p>
    </Card>
  );
}
