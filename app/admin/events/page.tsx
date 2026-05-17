import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { EventCard } from "@/components/mppga/admin/EventCard";
import { Button } from "@/components/mppga/ui/button";
import { loadAdminEvents } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/supabase/session";

export default async function AdminEventsPage() {
  await requireAdmin();
  const events = await loadAdminEvents();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Events"
        description="Workshops, clinics, mixers, and the annual meeting. Admins can publish directly. No board approval step."
        actions={
          <Button href="/admin/events/new" variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New event
          </Button>
        }
      />

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-mppga-divider bg-mppga-card p-10 text-center">
          <p className="font-serif text-lg text-mppga-ink">
            No events yet.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mppga-ink-soft">
            Create your first event to populate the public events page.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
