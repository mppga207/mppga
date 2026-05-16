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
        description="Edit every section of the public landing page — hero through footer. Saving writes to the site_content singleton and revalidates every public route."
      />

      <ContentEditor
        initialContent={loaded.content}
        isDefault={loaded.isDefault}
        updatedAt={loaded.updatedAt}
      />
    </div>
  );
}
