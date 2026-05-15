import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

export default function AdminEmailsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader title="Emails" />

      <Card title="Templates and timing">
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          No templates configured yet.
        </div>
      </Card>
    </div>
  );
}
