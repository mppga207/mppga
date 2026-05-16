// Shared email sender for Supabase Edge Functions (Deno runtime).
//
// Mirrors `lib/email/send.ts` and `lib/email/render.ts` for Deno:
// - Loads the DB-backed template from `email_templates` by key
// - Reads contact info from `site_settings`
// - Substitutes `{{var}}` placeholders
// - Appends the standard footer (with 501(c)(6) disclaimer when
//   the template is dues-related)
// - Checks `email_send_log` for a duplicate before sending
// - Calls Resend's HTTP API directly (no SDK to keep the Deno
//   bundle small)
// - Inserts the `email_send_log` row after the send attempt
//
// Code is duplicated between Node and Deno because the runtimes can't
// share imports. Keep the two implementations behaviorally identical;
// the unit tests in `lib/email/render.test.ts` exercise the Node side
// and document the contract.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DUES_DISCLAIMER =
  "Dues paid to MPPGA are not deductible as charitable contributions for federal income tax purposes but may be deductible as ordinary business expenses.";

const VAR_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

const RESEND_API = "https://api.resend.com/emails";

export type TriggerType = "automated" | "manual" | "webhook";

export type RenderVars = Record<string, string | number | null | undefined>;

export interface SendArgs {
  templateKey: string;
  to: string;
  triggerType: TriggerType;
  profileId: string | null;
  referenceId: string | null;
  vars?: RenderVars;
}

export type SendResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped_duplicate" }
  | { status: "skipped_missing_template" }
  | { status: "failed"; reason: string };

interface TemplateRow {
  key: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_dues_related: boolean;
}

interface SiteContact {
  email: string;
  phone: string | null;
}

interface ResendConfig {
  apiKey: string;
  fromHeader: string;
  siteUrl: string;
}

export function resendConfigFromEnv(): ResendConfig {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "mppga207@gmail.com";
  const fromName =
    Deno.env.get("RESEND_FROM_NAME") ??
    "Maine Professional Pet Groomers Association";
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
  return {
    apiKey,
    fromHeader: `${fromName} <${fromEmail}>`,
    siteUrl,
  };
}

export async function sendTransactional(
  supabase: SupabaseClient,
  config: ResendConfig,
  args: SendArgs,
): Promise<SendResult> {
  if (args.profileId && args.referenceId) {
    const { data: existing } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("profile_id", args.profileId)
      .eq("template", args.templateKey)
      .eq("reference_id", args.referenceId)
      .limit(1)
      .maybeSingle();
    if (existing) return { status: "skipped_duplicate" };
  }

  const template = await loadTemplate(supabase, args.templateKey);
  if (!template) {
    console.error(`[email:send] missing template "${args.templateKey}"`);
    return { status: "skipped_missing_template" };
  }

  const contact = await loadSiteContact(supabase, config);
  const rendered = renderTemplate(template, args.vars ?? {}, contact, config);

  let messageId: string | null = null;
  let status: "sent" | "failed" = "sent";
  let reason: string | null = null;

  try {
    const resp = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: config.fromHeader,
        to: args.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });
    if (!resp.ok) {
      status = "failed";
      const body = await resp.text().catch(() => "");
      reason = `resend_${resp.status}: ${body.slice(0, 200)}`;
    } else {
      const body = (await resp.json().catch(() => null)) as { id?: string } | null;
      messageId = body?.id ?? null;
    }
  } catch (err) {
    status = "failed";
    reason = err instanceof Error ? err.message : "unknown_error";
  }

  const { error: logError } = await supabase.from("email_send_log").insert({
    profile_id: args.profileId,
    template: args.templateKey,
    trigger_type: args.triggerType,
    reference_id: args.referenceId,
    resend_message_id: messageId,
    status,
  });
  if (logError) {
    console.error("[email:send] log insert failed", logError.message);
  }

  if (status === "failed") return { status: "failed", reason: reason ?? "unknown" };
  return { status: "sent", messageId };
}

async function loadTemplate(
  supabase: SupabaseClient,
  key: string,
): Promise<TemplateRow | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("key, subject, body_html, body_text, is_dues_related")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`template lookup failed: ${error.message}`);
  return (data as TemplateRow | null) ?? null;
}

async function loadSiteContact(
  supabase: SupabaseClient,
  config: ResendConfig,
): Promise<SiteContact> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("contact_email, contact_phone")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`site_settings lookup failed: ${error.message}`);
  const row = data as { contact_email: string; contact_phone: string | null } | null;
  return {
    email: row?.contact_email ?? config.fromHeader,
    phone: row?.contact_phone ?? null,
  };
}

function renderTemplate(
  template: TemplateRow,
  vars: RenderVars,
  contact: SiteContact,
  config: ResendConfig,
): { subject: string; html: string; text: string } {
  const baseVars: RenderVars = {
    site_url: config.siteUrl,
    contact_email: contact.email,
    contact_phone: contact.phone ?? "",
    ...vars,
  };

  const subject = substitute(template.subject, baseVars);
  const bodyHtml = substitute(template.body_html, baseVars);
  const bodyText = substitute(template.body_text, baseVars);

  const footer = composeFooter(contact, template.is_dues_related);
  return {
    subject,
    html: `${bodyHtml}\n${footer.html}`,
    text: `${bodyText}${footer.text}`,
  };
}

function substitute(input: string, vars: RenderVars): string {
  return input.replace(VAR_PATTERN, (_, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

function composeFooter(
  contact: SiteContact,
  isDuesRelated: boolean,
): { html: string; text: string } {
  const orgLine = "Maine Professional Pet Groomers Association";
  const contactLine = `Contact: ${contact.email}`;
  const disclaimer = isDuesRelated ? DUES_DISCLAIMER : null;

  const htmlParts = [
    `<p style="color:#7a7a75;font-size:12px;margin-top:32px">`,
    `${escapeHtml(orgLine)}<br/>`,
    `${escapeHtml(contactLine)}`,
  ];
  if (disclaimer) htmlParts.push(`<br/><br/><em>${escapeHtml(disclaimer)}</em>`);
  htmlParts.push(`</p>`);

  const textParts = ["", "--", orgLine, contactLine];
  if (disclaimer) textParts.push("", disclaimer);

  return { html: htmlParts.join("\n"), text: textParts.join("\n") };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
