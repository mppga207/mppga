import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { ContentEditor } from "@/components/mppga/admin/ContentEditor";

export default function AdminContentPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Content"
        description="Edit every text block on the public landing page — no developer required. Changes here will save back to the live site once Supabase is wired up."
      />

      <ContentEditor />
    </div>
  );
}
