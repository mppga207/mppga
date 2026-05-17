"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

export async function markContactSubmissionReadAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  // contact_submissions_admin_update RLS gates this — user-scoped
  // client carrying the admin claim is sufficient.
  const supabase = await createClient();
  await supabase
    .from("contact_submissions")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin");
}
