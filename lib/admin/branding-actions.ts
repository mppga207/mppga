"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "branding";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — logos are small
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
]);

async function logAdminAction(
  actorProfileId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: null,
    action: "setting_change",
    payload: JSON.parse(JSON.stringify({ setting: "branding_logo", ...payload })),
  });
  if (error) {
    console.error("admin_action_log insert failed", error);
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export async function uploadLogoAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/settings?error=no_file");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    redirect("/admin/settings?error=invalid_type");
  }
  if (file.size > MAX_BYTES) {
    redirect("/admin/settings?error=too_large");
  }

  const supabase = createServiceRoleClient();

  // Drop the previous logo if there is one. We use a stable path name
  // per upload (timestamped) so cached responses against the public URL
  // get a cache-busted refresh.
  const { data: prior } = await supabase
    .from("site_settings")
    .select("logo_path")
    .limit(1)
    .maybeSingle();

  const ext = mimeToExt(file.type);
  const newPath = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    redirect(`/admin/settings?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: updateError } = await supabase
    .from("site_settings")
    .update({ logo_path: newPath })
    .eq("id", "00000000-0000-0000-0000-000000000002");
  if (updateError) {
    // Roll back the upload so we don't leak orphan files.
    await supabase.storage.from(BUCKET).remove([newPath]);
    redirect(
      `/admin/settings?error=${encodeURIComponent(updateError.message)}`,
    );
  }

  // Clean up the previous logo. Best-effort: if it fails, the new logo
  // is already live; the orphan can be cleaned manually later.
  if (prior?.logo_path && prior.logo_path !== newPath) {
    await supabase.storage.from(BUCKET).remove([prior.logo_path]);
  }

  await logAdminAction(session.user.id, {
    action: "upload",
    new_path: newPath,
    prior_path: prior?.logo_path ?? null,
    size_bytes: file.size,
    content_type: file.type,
  });

  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=logo_uploaded");
}

export async function removeLogoAction(): Promise<void> {
  const session = await requireAdmin();

  const supabase = createServiceRoleClient();
  const { data: prior } = await supabase
    .from("site_settings")
    .select("logo_path")
    .limit(1)
    .maybeSingle();

  if (!prior?.logo_path) {
    redirect("/admin/settings?ok=logo_removed");
  }

  const { error: updateError } = await supabase
    .from("site_settings")
    .update({ logo_path: null })
    .eq("id", "00000000-0000-0000-0000-000000000002");
  if (updateError) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(updateError.message)}`,
    );
  }
  await supabase.storage.from(BUCKET).remove([prior.logo_path]);

  await logAdminAction(session.user.id, {
    action: "remove",
    prior_path: prior.logo_path,
  });

  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=logo_removed");
}
