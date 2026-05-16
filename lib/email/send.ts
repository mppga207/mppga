import { createServiceRoleClient } from "@/lib/supabase/server";
import type { EmailTriggerType } from "@/types/database";

/**
 * Stub send helper — Track 2 deliverable.
 *
 * Writes to `email_send_log` with the dedup key from
 * `email-automation.md` §4 so redelivery is safe, then logs the would-be
 * payload to the server console. The Resend API call lives in Track 4 —
 * this helper exists now so call sites (membership-status-sync, the
 * webhook handler) can wire `sendTransactional` once and not have to
 * change when Resend lands.
 *
 * Track 4 swaps the console.log block for `resend.emails.send(...)` and
 * stores the returned `resend_message_id`.
 */
export interface SendArgs {
  template: string;
  to: string;
  triggerType: EmailTriggerType;
  profileId: string | null;
  referenceId: string | null;
  /** Render-time variables surfaced in the dev console for debugging. */
  data?: Record<string, unknown>;
}

export type SendResult =
  | { status: "sent" }
  | { status: "skipped_duplicate" }
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

  const { error } = await client.from("email_send_log").insert({
    profile_id: args.profileId,
    template: args.template,
    trigger_type: args.triggerType,
    reference_id: args.referenceId,
    resend_message_id: null,
    status: "sent",
  });
  if (error) {
    return { status: "failed", reason: error.message };
  }

  // TODO(track 4 — email-automation.md): replace this with a real Resend
  // call. The dedup write above happens first so a webhook retry can't
  // produce a duplicate send even if Resend itself is briefly down.
  console.info(
    `[email:stub] would send ${args.template} to ${args.to}`,
    args.data ?? {},
  );

  return { status: "sent" };
}
