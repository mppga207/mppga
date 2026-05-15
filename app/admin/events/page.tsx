import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { EventCard } from "@/components/mppga/admin/EventCard";
import { Button } from "@/components/mppga/ui/button";
import { mockEvents } from "@/lib/mppga/admin/mockEvents";

export default function AdminEventsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Events"
        actions={
          <Button href="/admin/events/new" variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New event
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {mockEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
