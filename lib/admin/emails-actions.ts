"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTransactional } from "@/lib/email/send";
import { composeBroadcast } from "@/lib/email/compose-broadcast";

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
// Automated send toggles
// =========================================================================

export async function toggleEmailTemplateEnabledAction(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  // Checkboxes only post when checked, so absence = disabled.
  const enabled = formData.get("enabled") === "on";

  if (!key) redirect("/admin/emails?error=invalid_input");

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("email_templates")
    .update({ is_enabled: enabled })
    .eq("key", key);
  if (error) {
    redirect(`/admin/emails?error=${encodeURIComponent(error.message)}`);
  }

  await logAdminAction(session.user.id, "setting_change", {
    setting: "email_template_enabled",
    template_key: key,
    enabled,
  });

  revalidatePath("/admin/emails");
  redirect(
    enabled
      ? "/admin/emails?ok=automation_enabled"
      : "/admin/emails?ok=automation_disabled",
  );
}

// =========================================================================
// Send a test
// =========================================================================

/**
 * Sample variables passed when rendering a template preview for the
 * Send-test flow. Covers every variable surfaced anywhere in the
 * automated email set so the rendered output doesn't have blank
 * placeholders.
 */
const TEST_RENDER_VARS = {
  full_name: "Pat Sample",
  first_name: "Pat",
  tier_name: "Professional",
  amount_due: "$75.00",
  amount: "$75.00",
  renewal_date: "December 31, 2026",
  expires_at: "December 31, 2026",
  invoice_url: "https://example.com/invoice",
  manage_billing_url: "https://example.com/billing",
  event_title: "Spring grooming clinic",
  event_date: "June 14, 2026",
  event_location: "Portland, ME",
  waitlist_position: "2",
  checkout_url: "https://example.com/checkout",
} as const;

export async function sendTestEmailAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  if (!key) redirect("/admin/emails?error=invalid_input");

  const adminEmail = session.user.email;
  if (!adminEmail) {
    redirect(
      `/admin/emails?error=no_admin_email&template=${encodeURIComponent(key)}`,
    );
  }

  const result = await sendTransactional({
    template: key,
    to: adminEmail,
    triggerType: "manual",
    profileId: session.user.id,
    // Reference id is set per-call so the dedup check never blocks
    // re-sending a test from the admin UI.
    referenceId: `test-${Date.now()}`,
    vars: TEST_RENDER_VARS,
  });

  await logAdminAction(session.user.id, "email_resend", {
    template_key: key,
    intent: "send_test",
    to: adminEmail,
    result: result.status,
  });

  revalidatePath("/admin/emails");
  if (result.status === "sent") {
    redirect(
      `/admin/emails?ok=test_sent&template=${encodeURIComponent(key)}`,
    );
  }
  if (result.status === "skipped_disabled") {
    redirect(
      `/admin/emails?error=template_disabled&template=${encodeURIComponent(key)}`,
    );
  }
  if (result.status === "skipped_missing_template") {
    redirect(
      `/admin/emails?error=missing_template&template=${encodeURIComponent(key)}`,
    );
  }
  redirect(
    `/admin/emails?error=test_failed&template=${encodeURIComponent(key)}`,
  );
}

// =========================================================================
// Broadcast (admin-composed announcement)
// =========================================================================

type BroadcastAudience = "active" | "all";

function isBroadcastAudience(value: string): value is BroadcastAudience {
  return value === "active" || value === "all";
}

export async function sendBroadcastAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const subject = String(formData.get("subject") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const ctaText = String(formData.get("cta_text") ?? "").trim();
  const ctaUrl = String(formData.get("cta_url") ?? "").trim();
  const audienceRaw = String(formData.get("audience") ?? "");

  if (!subject || !headline || !body) {
    redirect("/admin/emails?error=broadcast_missing_fields");
  }
  // Either both CTA fields are filled or both are blank.
  if ((ctaText && !ctaUrl) || (!ctaText && ctaUrl)) {
    redirect("/admin/emails?error=broadcast_partial_cta");
  }
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
    redirect("/admin/emails?error=broadcast_invalid_url");
  }
  if (!isBroadcastAudience(audienceRaw)) {
    redirect("/admin/emails?error=broadcast_invalid_audience");
  }
  const audience: BroadcastAudience = audienceRaw;

  const composed = composeBroadcast({
    subject,
    headline,
    body,
    ctaText,
    ctaUrl,
  });
  const bodyHtml = composed.bodyHtml;
  const bodyText = composed.bodyText;

  const supabase = createServiceRoleClient();

  // Use the `general-update` template as the carrier — its subject /
  // body get overwritten in-flight by what the admin composed; the
  // shared footer (org name, contact, etc.) still gets appended by
  // the renderer. The template row stays untouched on disk.
  const overrideKey = "general-update";

  // Resolve recipient list. Active includes Honorary + Grace_Period
  // per loadBroadcastAudienceCounts so the audience counts you see
  // in the composer match what actually gets sent.
  const { data: rawProfiles, error: queryError } = await supabase
    .from("profiles")
    .select("id, email, full_name, memberships(status)")
    .returns<
      {
        id: string;
        email: string;
        full_name: string | null;
        memberships: { status: string } | null;
      }[]
    >();
  if (queryError) {
    redirect(`/admin/emails?error=${encodeURIComponent(queryError.message)}`);
  }
  const recipients = (rawProfiles ?? []).filter((row) => {
    if (audience === "all") return Boolean(row.email);
    const status = row.memberships?.status;
    return (
      Boolean(row.email) &&
      (status === "Active" || status === "Honorary" || status === "Grace_Period")
    );
  });

  // Build a one-off "template" record for the renderer by writing the
  // override copy onto the `general-update` row, sending, and restoring.
  // Simpler than threading override copy through the send helper.
  const { data: priorRow, error: priorError } = await supabase
    .from("email_templates")
    .select("subject, body_html, body_text")
    .eq("key", overrideKey)
    .maybeSingle<{ subject: string; body_html: string; body_text: string }>();
  if (priorError || !priorRow) {
    redirect("/admin/emails?error=broadcast_template_missing");
  }

  const { error: stageError } = await supabase
    .from("email_templates")
    .update({
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
    })
    .eq("key", overrideKey);
  if (stageError) {
    redirect(`/admin/emails?error=${encodeURIComponent(stageError.message)}`);
  }

  // Each send gets its own reference id so the send-log doesn't
  // dedup multiple broadcasts to the same member.
  const broadcastId = `broadcast-${Date.now()}`;
  let sentCount = 0;
  let failedCount = 0;
  for (const recipient of recipients) {
    const result = await sendTransactional({
      template: overrideKey,
      to: recipient.email,
      triggerType: "manual",
      profileId: recipient.id,
      referenceId: broadcastId,
      vars: {
        full_name: recipient.full_name ?? "",
        first_name: (recipient.full_name ?? "").split(" ")[0] ?? "",
      },
    });
    if (result.status === "sent") sentCount += 1;
    else failedCount += 1;
  }

  // Restore the canonical template copy so future automated / manual
  // sends of `general-update` use the saved version, not this
  // broadcast's one-off text.
  await supabase
    .from("email_templates")
    .update(priorRow)
    .eq("key", overrideKey);

  await logAdminAction(session.user.id, "email_resend", {
    intent: "broadcast",
    audience,
    recipients_targeted: recipients.length,
    sent: sentCount,
    failed: failedCount,
    broadcast_id: broadcastId,
    subject,
    headline,
    has_cta: Boolean(ctaText && ctaUrl),
  });

  revalidatePath("/admin/emails");
  redirect(
    `/admin/emails?ok=broadcast_sent&sent=${sentCount}&failed=${failedCount}`,
  );
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
