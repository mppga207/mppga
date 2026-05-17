import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { ContentEditor } from "@/components/mppga/admin/ContentEditor";
import { loadLandingContent } from "@/lib/admin/content-data";
import { requireAdmin } from "@/lib/supabase/session";

export default async function AdminContentPage() {
  await requireAdmin();
  const loaded = await loadLandingContent();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Content"
        description="Edit every section of the public landing page, from the hero through the footer. Saved changes go live on the site immediately."
      />

      <ContentEditor
        initialContent={loaded.content}
        isDefault={loaded.isDefault}
        updatedAt={loaded.updatedAt}
      />
    </div>
  );
}
