import { getResend, resendFromHeader } from "@/lib/resend/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  loadSiteContact,
  loadTemplate,
  renderTemplate,
  type RenderVars,
} from "@/lib/email/render";
import type { EmailTriggerType } from "@/types/database";

/**
 * Single send helper per `email-automation.md` §4 and Track 4 of the
 * Phase 1 buildout.
 *
 * Contract:
 *   1. If (profile_id, template, reference_id) is set, check
 *      `email_send_log` first. Found → return skipped_duplicate, no
 *      side effects. This is what makes Stripe webhook retries safe.
 *   2. Load the DB-backed template and render with `vars`.
 *   3. Call Resend.
 *   4. Insert the `email_send_log` row with the resulting status and
 *      Resend message id (if any). `email_send_log` is append-only
 *      (data-model.md §11) — we never UPDATE it.
 *
 * The "check before insert" order matters: we want one log row per
 * actual attempt, and the dedup check is the cheap path. The trade-off
 * is a small race window where two concurrent calls with the same key
 * could both pass the dedup read and both send — webhook retries and
 * single-instance crons don't fire concurrently, so we live with it.
 */
export interface SendArgs {
  template: string;
  to: string;
  triggerType: EmailTriggerType;
  profileId: string | null;
  referenceId: string | null;
  vars?: RenderVars;
}

export type SendResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped_duplicate" }
  | { status: "skipped_missing_template" }
  | { status: "failed"; reason: string };

export async function sendTransactional(args: SendArgs): Promise<SendResult> {
  const client = createServiceRoleClient();

  if (args.profileId && args.referenceId) {
    const { data: existing } = await client
      .from("email_send_log")
      .select("id")
      .eq("profile_id", args.profileId)
      .eq("template", args.template)
      .eq("reference_id", args.referenceId)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { status: "skipped_duplicate" };
    }
  }

  const template = await loadTemplate(client, args.template);
  if (!template) {
    console.error(`[email:send] missing template "${args.template}"`);
    return { status: "skipped_missing_template" };
  }

  const contact = await loadSiteContact(client);
  const rendered = renderTemplate(template, args.vars ?? {}, contact);

  let messageId: string | null = null;
  let sendStatus: "sent" | "failed" = "sent";
  let failureReason: string | null = null;

  try {
    const { data, error } = await getResend().emails.send({
      from: resendFromHeader(),
      to: args.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (error) {
      sendStatus = "failed";
      failureReason = error.message ?? "unknown_resend_error";
    } else {
      messageId = data?.id ?? null;
    }
  } catch (err) {
    sendStatus = "failed";
    failureReason = err instanceof Error ? err.message : "unknown_error";
  }

  const { error: logError } = await client.from("email_send_log").insert({
    profile_id: args.profileId,
    template: args.template,
    trigger_type: args.triggerType,
    reference_id: args.referenceId,
    resend_message_id: messageId,
    status: sendStatus,
  });
  if (logError) {
    // The send itself may have already gone out. Surfacing this is
    // more useful than swallowing — the admin Send-history view will
    // show the gap and Resend's dashboard is the source of truth.
    console.error("[email:send] log insert failed", logError.message);
  }

  if (sendStatus === "failed") {
    return { status: "failed", reason: failureReason ?? "unknown_error" };
  }
  return { status: "sent", messageId };
}
