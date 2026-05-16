import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { cancelRegistrationAction } from "@/lib/admin/actions";
import {
  loadAdminEventRegistrations,
  loadAdminEvents,
} from "@/lib/admin/data";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const events = await loadAdminEvents();
  const event = events.find((e) => e.id === id);
  if (!event) return { title: "Registrations · Admin · MPPGA" };
  return { title: `Registrations · ${event.title} · Admin · MPPGA` };
}

export default async function AdminEventRsvpsPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const events = await loadAdminEvents();
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const registrations = await loadAdminEventRegistrations(id);
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waitlisted = registrations.filter((r) => r.status === "waitlisted");
  const cancelled = registrations.filter((r) => r.status === "cancelled");

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
      />

      {ok === "cancelled" ? (
        <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
          Registration cancelled. The next waitlisted member has been promoted if there was one.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
          Something went wrong: {error}.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Confirmed" value={confirmed.length} />
        <Summary label="Waitlisted" value={waitlisted.length} />
        <Summary
          label="Capacity"
          value={`${confirmed.length}/${event.capacity}`}
        />
      </div>

      <RegistrationGroup
        title="Confirmed"
        registrations={confirmed}
        eventId={event.id}
        emptyMessage="No confirmed registrations yet."
      />
      {event.waitlistEnabled ? (
        <RegistrationGroup
          title="Waitlist"
          registrations={waitlisted}
          eventId={event.id}
          emptyMessage="No one on the waitlist."
        />
      ) : null}
      {cancelled.length > 0 ? (
        <RegistrationGroup
          title="Cancelled"
          registrations={cancelled}
          eventId={event.id}
          emptyMessage=""
          allowCancel={false}
        />
      ) : null}
    </div>
  );

  function RegistrationGroup({
    title,
    registrations,
    eventId,
    emptyMessage,
    allowCancel = true,
  }: {
    title: string;
    registrations: Awaited<ReturnType<typeof loadAdminEventRegistrations>>;
    eventId: string;
    emptyMessage: string;
    allowCancel?: boolean;
  }) {
    return (
      <Card title={title}>
        {registrations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-mppga-ink-soft">
            {emptyMessage}
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Registrant</th>
                <th className="px-6 py-3 font-medium">Tier</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                <th className="px-6 py-3 font-medium">Registered</th>
                {allowCancel ? <th className="px-6 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-mppga-divider">
              {registrations.map((reg) => (
                <tr key={reg.id}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-mppga-ink">
                      {reg.registrantName}
                      {reg.waitlistPosition
                        ? ` · #${reg.waitlistPosition}`
                        : ""}
                    </p>
                    <p className="text-xs text-mppga-ink-muted">{reg.email}</p>
                  </td>
                  <td className="px-6 py-3 text-mppga-ink-soft">
                    {reg.pricingTier}
                  </td>
                  <td className="px-6 py-3 text-mppga-ink-soft">
                    {reg.paymentStatus}
                    {reg.pricePaid > 0
                      ? ` · $${(reg.pricePaid / 100).toFixed(0)}`
                      : ""}
                  </td>
                  <td className="px-6 py-3 text-xs text-mppga-ink-soft">
                    {dateTimeFmt.format(new Date(reg.registeredAt))}
                  </td>
                  {allowCancel ? (
                    <td className="px-6 py-3 text-right">
                      <form action={cancelRegistrationAction}>
                        <input
                          type="hidden"
                          name="registration_id"
                          value={reg.id}
                        />
                        <input type="hidden" name="event_id" value={eventId} />
                        <Button
                          type="submit"
                          variant="ghost"
                          className="!h-auto !px-0 text-xs"
                        >
                          Cancel
                        </Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    );
  }
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl tracking-tight text-mppga-teal-deep">
        {value}
      </p>
    </Card>
  );
}
