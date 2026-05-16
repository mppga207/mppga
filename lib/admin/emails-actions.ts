"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Append-only audit writer for admin actions in the Emails tab. Mirrors
 * `lib/admin/actions.ts#logAdminAction` — duplicated to avoid an
 * unnecessary export ring between server-action files.
 */
async function logAdminAction(
  actorProfileId: string,
  action:
    | "template_edit"
    | "setting_change"
    | "email_resend",
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: null,
    action,
    payload: JSON.parse(JSON.stringify(payload)),
  });
  if (error) {
    console.error("admin_action_log insert failed", action, error);
  }
}

// =========================================================================
// Email templates
// =========================================================================

export async function updateEmailTemplateAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("body_html") ?? "");
  const bodyText = String(formData.get("body_text") ?? "");
  const description = String(formData.get("description") ?? "");

  if (!key || !name || !subject || !bodyHtml || !bodyText) {
    redirect(`/admin/emails?error=invalid_input&template=${encodeURIComponent(key)}`);
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      name,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      description,
    })
    .eq("key", key);
  if (error) {
    redirect(
      `/admin/emails?error=${encodeURIComponent(error.message)}&template=${encodeURIComponent(key)}`,
    );
  }

  await logAdminAction(session.user.id, "template_edit", {
    template_key: key,
    subject,
    description,
  });

  revalidatePath("/admin/emails");
  redirect(`/admin/emails?ok=template_saved&template=${encodeURIComponent(key)}`);
}

export async function createEmailTemplateAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("body_html") ?? "");
  const bodyText = String(formData.get("body_text") ?? "");

  if (!key || !/^[a-z][a-z0-9-]*$/.test(key)) {
    redirect("/admin/emails?error=invalid_key");
  }
  if (!name || !subject || !bodyHtml || !bodyText) {
    redirect("/admin/emails?error=missing_fields");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("email_templates").insert({
    key,
    name,
    subject,
    body_html: bodyHtml,
    body_text: bodyText,
    is_dues_related: false,
    is_system: false,
    description: "",
    available_variables: [],
  });
  if (error) {
    redirect(`/admin/emails?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(session.user.id, "template_edit", {
    template_key: key,
    action: "create",
  });

  revalidatePath("/admin/emails");
  redirect(`/admin/emails?ok=template_created&template=${encodeURIComponent(key)}`);
}

export async function deleteEmailTemplateAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  if (!key) redirect("/admin/emails");

  const supabase = createServiceRoleClient();
  // System rows reject deletion at the trigger level — surface a clean
  // error rather than letting the exception bubble.
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("key", key);
  if (error) {
    redirect(`/admin/emails?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(session.user.id, "template_edit", {
    template_key: key,
    action: "delete",
  });

  revalidatePath("/admin/emails");
  redirect("/admin/emails?ok=template_deleted");
}

// =========================================================================
// Email settings (timing)
// =========================================================================

function parseIntArray(raw: string): number[] | null {
  const parts = raw
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const result: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0) return null;
    result.push(n);
  }
  // Sort descending matches the cron's preference (largest bucket first).
  return result.sort((a, b) => b - a);
}

export async function updateEmailSettingsAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const renewal = parseIntArray(
    String(formData.get("renewal_reminder_days_before") ?? ""),
  );
  const event = parseIntArray(
    String(formData.get("event_reminder_hours_before") ?? ""),
  );
  const dunning = parseIntArray(
    String(formData.get("dunning_retry_days") ?? ""),
  );
  const expiry = Number(
    formData.get("waitlist_payment_link_expiry_hours") ?? "",
  );

  if (
    !renewal ||
    !event ||
    !dunning ||
    !Number.isInteger(expiry) ||
    expiry <= 0
  ) {
    redirect("/admin/emails?error=invalid_settings");
  }

  const supabase = createServiceRoleClient();

  // Read prior values for the audit payload.
  const { data: prior } = await supabase
    .from("email_settings")
    .select(
      "renewal_reminder_days_before, event_reminder_hours_before, dunning_retry_days, waitlist_payment_link_expiry_hours",
    )
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("email_settings")
    .update({
      renewal_reminder_days_before: renewal,
      event_reminder_hours_before: event,
      dunning_retry_days: dunning,
      waitlist_payment_link_expiry_hours: expiry,
    })
    .eq("id", "00000000-0000-0000-0000-000000000001");
  if (error) {
    redirect(`/admin/emails?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(session.user.id, "setting_change", {
    setting: "email_settings",
    prior,
    next: {
      renewal_reminder_days_before: renewal,
      event_reminder_hours_before: event,
      dunning_retry_days: dunning,
      waitlist_payment_link_expiry_hours: expiry,
    },
  });

  revalidatePath("/admin/emails");
  redirect("/admin/emails?ok=settings_saved");
}
