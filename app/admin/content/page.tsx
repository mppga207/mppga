import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { ContentEditor } from "@/components/mppga/admin/ContentEditor";

export default function AdminContentPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Content"
        description="Edit every section of the public landing page — hero through footer. Changes preview here; persistence to Supabase is being wired up."
      />

      <ContentEditor />
    </div>
  );
}
