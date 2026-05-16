import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Email template rendering per `email-automation.md` §5–§6 and
 * `brand.md` §5.
 *
 * Pure-ish functions: `substitute` and `composeFooter` are deterministic;
 * `loadTemplate` and `loadSiteContact` hit Supabase. The render result
 * has no awareness of Resend — `lib/email/send.ts` is responsible for
 * the wire call.
 *
 * Variable substitution: `{{var}}`. Missing variables render as empty
 * strings; this matches the admin Emails tab promise that any
 * template can be authored without knowing every variable a caller
 * might pass.
 */

const DUES_DISCLAIMER =
  "Dues paid to MPPGA are not deductible as charitable contributions for federal income tax purposes but may be deductible as ordinary business expenses.";

export type TemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];
export type SiteContact = {
  email: string;
  phone: string | null;
};

export type RenderVars = Record<string, string | number | null | undefined>;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const VAR_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function substitute(template: string, vars: RenderVars): string {
  return template.replace(VAR_PATTERN, (_, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

export function composeFooter(
  contact: SiteContact,
  isDuesRelated: boolean,
): { html: string; text: string } {
  const orgLine = "Maine Professional Pet Groomers Association";
  const contactLine = `Contact: ${contact.email}`;
  // Resend appends its unsubscribe link automatically when an audience
  // is used; for transactional sends we surface the contact email so
  // members can reach the board even if they want off the list. The
  // CAN-SPAM unsubscribe affordance is provided by Resend's footer
  // injection on broadcasts — handled outside the per-send render.
  const disclaimer = isDuesRelated ? DUES_DISCLAIMER : null;

  const htmlLines: string[] = [
    `<p style="color:#7a7a75;font-size:12px;margin-top:32px">`,
    `${escapeHtml(orgLine)}<br/>`,
    `${escapeHtml(contactLine)}`,
  ];
  if (disclaimer) {
    htmlLines.push(`<br/><br/><em>${escapeHtml(disclaimer)}</em>`);
  }
  htmlLines.push(`</p>`);

  const textLines = ["", "--", orgLine, contactLine];
  if (disclaimer) {
    textLines.push("", disclaimer);
  }

  return {
    html: htmlLines.join("\n"),
    text: textLines.join("\n"),
  };
}

export function renderTemplate(
  template: Pick<
    TemplateRow,
    "subject" | "body_html" | "body_text" | "is_dues_related"
  >,
  vars: RenderVars,
  contact: SiteContact,
): RenderedEmail {
  const baseVars: RenderVars = {
    site_url: env.siteUrl,
    contact_email: contact.email,
    contact_phone: contact.phone ?? "",
    ...vars,
  };

  const footer = composeFooter(contact, template.is_dues_related);

  return {
    subject: substitute(template.subject, baseVars),
    html: `${substitute(template.body_html, baseVars)}\n${footer.html}`,
    text: `${substitute(template.body_text, baseVars)}${footer.text}`,
  };
}

export async function loadTemplate(
  client: SupabaseClient<Database>,
  key: string,
): Promise<TemplateRow | null> {
  const { data, error } = await client
    .from("email_templates")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    throw new Error(`email template lookup failed for "${key}": ${error.message}`);
  }
  return data ?? null;
}

export async function loadSiteContact(
  client: SupabaseClient<Database>,
): Promise<SiteContact> {
  const { data, error } = await client
    .from("site_settings")
    .select("contact_email, contact_phone")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`site_settings lookup failed: ${error.message}`);
  }
  return {
    email: data?.contact_email ?? env.resend.fromEmail,
    phone: data?.contact_phone ?? null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
