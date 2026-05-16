import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
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

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) return { title: "Event · Admin · MPPGA" };
  return { title: `Edit ${event.title} · Admin · MPPGA` };
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) notFound();

  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : null;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to events
        </Link>
      </div>

      <AdminPageHeader
        title={event.title}
        description="Inline editing is being wired up. For now this page surfaces the saved values so you can confirm an event's state at a glance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button href={`/admin/events/${event.id}/rsvps`} variant="secondary">
              View RSVPs
            </Button>
            <Button disabled>Edit details</Button>
          </div>
        }
      />

      <Card title="Status & scheduling">
        <dl className="divide-y divide-mppga-divider">
          <SummaryRow
            label="Status"
            value={
              <StatusBadge
                label={event.status}
                tone={event.status === "Published" ? "teal" : "muted"}
              />
            }
          />
          <SummaryRow
            label="Start"
            value={
              <span className="flex items-center gap-2 text-sm text-mppga-ink">
                <Calendar className="h-4 w-4 text-mppga-teal" strokeWidth={1.8} />
                {dateFmt.format(start)} · {timeFmt.format(start)}
              </span>
            }
          />
          {end ? (
            <SummaryRow
              label="End"
              value={
                <span className="text-sm text-mppga-ink">
                  {dateFmt.format(end)} · {timeFmt.format(end)}
                </span>
              }
            />
          ) : null}
          <SummaryRow
            label="Location"
            value={
              <span className="flex items-center gap-2 text-sm text-mppga-ink">
                <MapPin className="h-4 w-4 text-mppga-teal" strokeWidth={1.8} />
                {event.location}
              </span>
            }
          />
        </dl>
      </Card>

      <Card title="Pricing & capacity">
        <dl className="divide-y divide-mppga-divider">
          <SummaryRow
            label="Member price"
            value={
              <span className="font-serif text-lg text-mppga-ink">
                {formatPrice(event.memberPrice)}
              </span>
            }
          />
          <SummaryRow
            label="Guest price"
            value={
              <span className="font-serif text-lg text-mppga-ink">
                {formatPrice(event.guestPrice)}
              </span>
            }
          />
          <SummaryRow
            label="Capacity"
            value={
              <span className="text-sm text-mppga-ink">
                {event.rsvps} of {event.capacity} registered
              </span>
            }
          />
        </dl>
      </Card>

      <Card title="Description">
        <div className="px-6 py-5 text-sm leading-relaxed text-mppga-ink-soft">
          {event.description ? (
            <p className="whitespace-pre-line">{event.description}</p>
          ) : (
            <p className="italic text-mppga-ink-muted">No description set.</p>
          )}
        </div>
      </Card>

      <Card className="border-mppga-sand-deep bg-mppga-sand p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Danger zone
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mppga-ink-soft">
          Deleting an event cancels every registration and refunds any paid
          tickets through Stripe. We&rsquo;ll surface the full confirm flow
          once the server action lands.
        </p>
        <div className="mt-4">
          <Button variant="secondary" disabled>
            Delete event
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
