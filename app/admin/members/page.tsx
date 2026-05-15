import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

export default function AdminMembersPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader title="Members" />

      <Card title="Members table">
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          No members yet.
        </div>
      </Card>
    </div>
  );
}
