import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { ContentEditor } from "@/components/mppga/admin/ContentEditor";

export default function AdminContentPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader title="Content" />

      <ContentEditor />
    </div>
  );
}
