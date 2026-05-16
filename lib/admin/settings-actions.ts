"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

async function logAdminAction(
  actorProfileId: string,
  action: "setting_change" | "profile_edit",
  subjectProfileId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: subjectProfileId,
    action,
    payload: JSON.parse(JSON.stringify(payload)),
  });
  if (error) {
    console.error("admin_action_log insert failed", action, error);
  }
}

// =========================================================================
// Contact & site info
// =========================================================================

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateSiteContactAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const contactEmail = String(formData.get("contact_email") ?? "")
    .trim()
    .toLowerCase();
  const contactPhoneRaw = String(formData.get("contact_phone") ?? "").trim();
  const contactPhone = contactPhoneRaw === "" ? null : contactPhoneRaw;

  if (!EMAIL_RX.test(contactEmail)) {
    redirect("/admin/settings/contact?error=invalid_email");
  }

  const supabase = createServiceRoleClient();
  const { data: prior } = await supabase
    .from("site_settings")
    .select("contact_email, contact_phone")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("site_settings")
    .update({
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })
    .eq("id", "00000000-0000-0000-0000-000000000002");
  if (error) {
    redirect(
      `/admin/settings/contact?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logAdminAction(session.user.id, "setting_change", null, {
    setting: "site_settings",
    prior,
    next: { contact_email: contactEmail, contact_phone: contactPhone },
  });

  // Site contact is consumed everywhere — footer, contact page, email
  // footers, dashboard support links. Invalidate broadly.
  revalidatePath("/", "layout");
  redirect("/admin/settings/contact?ok=saved");
}

// =========================================================================
// Board roster
// =========================================================================

export async function promoteToAdminAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) redirect("/admin/settings/board?error=missing_profile");

  const supabase = createServiceRoleClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!target) {
    redirect("/admin/settings/board?error=not_found");
  }
  if (target.role === "admin") {
    redirect("/admin/settings/board?ok=already_admin");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profileId);
  if (updateError) {
    redirect(
      `/admin/settings/board?error=${encodeURIComponent(updateError.message)}`,
    );
  }

  // Force re-issue of JWT custom claims on next request from other
  // devices (auth-middleware.md §2.2). The target's current session
  // keeps its existing claims until refresh; their next sign-in or
  // token refresh picks up role=admin.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    try {
      await fetch(`${url}/auth/v1/admin/users/${profileId}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: "others" }),
      });
    } catch (err) {
      console.error("admin logout-others failed", err);
    }
  }

  await logAdminAction(session.user.id, "profile_edit", profileId, {
    action: "promote_to_admin",
    target_email: target.email,
  });

  revalidatePath("/admin/settings/board");
  redirect("/admin/settings/board?ok=promoted");
}

export async function demoteAdminAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) redirect("/admin/settings/board?error=missing_profile");

  if (profileId === session.user.id) {
    redirect("/admin/settings/board?error=cannot_demote_self");
  }

  const supabase = createServiceRoleClient();

  // Block demoting the last remaining admin — recoverable but disastrous.
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if ((count ?? 0) <= 1) {
    redirect("/admin/settings/board?error=last_admin");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!target || target.role !== "admin") {
    redirect("/admin/settings/board?error=not_admin");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "member" })
    .eq("id", profileId);
  if (updateError) {
    redirect(
      `/admin/settings/board?error=${encodeURIComponent(updateError.message)}`,
    );
  }

  // Force re-issue of JWT custom claims on next sign-in from the
  // demoted account's other devices.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    try {
      await fetch(`${url}/auth/v1/admin/users/${profileId}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: "others" }),
      });
    } catch (err) {
      console.error("admin logout-others failed", err);
    }
  }

  await logAdminAction(session.user.id, "profile_edit", profileId, {
    action: "demote_admin",
    target_email: target.email,
  });

  revalidatePath("/admin/settings/board");
  redirect("/admin/settings/board?ok=demoted");
}
