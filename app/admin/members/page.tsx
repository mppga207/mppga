import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

export default function AdminMembersPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Members"
        description="The roster — search, filter, and act on every active, pending, and lapsed groomer in the association."
      />

      <Card
        title="Members table"
        description="The filterable members table lands here in the next phase. Until then this is a stub."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          Coming soon.
        </div>
      </Card>
    </div>
  );
}
