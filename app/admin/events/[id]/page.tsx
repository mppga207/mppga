import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { EventForm } from "@/components/mppga/admin/EventForm";
import { Button } from "@/components/mppga/ui/button";
import { loadAdminEvents } from "@/lib/admin/data";
import { updateEventAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const events = await loadAdminEvents();
  const event = events.find((e) => e.id === id);
  if (!event) return { title: "Event · Admin · MPPGA" };
  return { title: `Edit ${event.title} · Admin · MPPGA` };
}

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const events = await loadAdminEvents();
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const error = typeof sp.error === "string" ? sp.error : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;

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
        description={`${event.location} · ${event.status === "published" ? "Live on the public events page" : "Draft — admin only"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button href={`/admin/events/${event.id}/rsvps`} variant="secondary">
              <Users className="h-4 w-4" strokeWidth={1.8} />
              {event.confirmedCount}
              {event.waitlistedCount > 0
                ? ` · ${event.waitlistedCount} waitlisted`
                : ""}
            </Button>
            {event.status === "published" ? (
              <Button href={`/events/${event.id}`} variant="ghost">
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                View public page
              </Button>
            ) : null}
          </div>
        }
      />

      {ok === "saved" ? (
        <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
          Changes saved.
        </div>
      ) : null}

      <EventForm
        mode="edit"
        action={updateEventAction}
        event={event}
        errorMessage={error}
      />
    </div>
  );
}
