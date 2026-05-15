import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

export default function AdminEmailsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Emails"
        description="Send timing, template copy, and the manual announcements that go out to the membership."
      />

      <Card
        title="Templates and timing"
        description="Renewal reminders, dunning, event reminders, and announcement composer will land here next."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          Coming soon.
        </div>
      </Card>
    </div>
  );
}
