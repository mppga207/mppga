import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { EventForm } from "@/components/mppga/admin/EventForm";
import { createEventAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "New event · Admin · MPPGA",
};

export default async function AdminNewEventPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to events
        </Link>
      </div>

      <AdminPageHeader
        title="New event"
        description="Create a workshop, clinic, mixer, or annual meeting. Save as a draft to keep working, or publish to push it live on the public events page."
      />

      <EventForm mode="create" action={createEventAction} errorMessage={error} />
    </div>
  );
}
