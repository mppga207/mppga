// Supabase Edge Function (Deno runtime).
//
// Dunning re-fire loop per `stripe-architecture.md` §4 +
// `email-automation.md` §3.3. Runs daily — scheduled via
// `supabase/config.toml` cron entry (TBD when deployed).
//
// Anchoring: the webhook fires the day-0 dunning immediately on
// `invoice.payment_failed` (stripe-architecture.md §4.1). The cron's
// job is the retry cadence after that. Anchor is the earliest
// `dunning` send_at for this profile. If no day-0 send exists, the
// cron does nothing — the webhook is expected to seed it.
//
// For each value `day` in `email_settings.dunning_retry_days`
// (default [3, 7, 14]), at most one send fires per cron run. The
// dedup `reference_id` is `<subscription_id>:<day>` so each retry
// day fires at most once per past_due episode regardless of how
// often the cron runs.
//
// AuthN: `verify_jwt = false` and gated by Authorization header
// against the service role key — same pattern as
// `membership-status-sync`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  resendConfigFromEnv,
  sendTransactional,
} from "../_shared/email-send.ts";

interface MembershipRow {
  id: string;
  profile_id: string;
  stripe_subscription_id: string | null;
  billing_status: string | null;
}

interface EmailSettingsRow {
  dunning_retry_days: number[];
}

interface ProfileRow {
  email: string;
  full_name: string;
}

interface SendLogRow {
  sent_at: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) return json({ error: "missing_env" }, 500);

  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${serviceKey}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resendConfig = resendConfigFromEnv();
  const siteUrl = resendConfig.siteUrl;
  const now = new Date();

  const { data: settings, error: settingsError } = await supabase
    .from("email_settings")
    .select("dunning_retry_days")
    .limit(1)
    .maybeSingle();
  if (settingsError) return json({ error: settingsError.message }, 500);
  const retryDays = ((settings as EmailSettingsRow | null)?.dunning_retry_days ??
    [3, 7, 14]).sort((a, b) => b - a);

  const { data: members, error: membersError } = await supabase
    .from("memberships")
    .select("id, profile_id, stripe_subscription_id, billing_status")
    .eq("billing_status", "past_due");
  if (membersError) return json({ error: membersError.message }, 500);

  const fired: Array<{ profile_id: string; day_bucket: number; status: string }> = [];

  for (const row of (members ?? []) as MembershipRow[]) {
    if (!row.stripe_subscription_id) continue;

    const { data: earliest } = await supabase
      .from("email_send_log")
      .select("sent_at")
      .eq("profile_id", row.profile_id)
      .eq("template", "dunning")
      .order("sent_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const earliestRow = earliest as SendLogRow | null;
    if (!earliestRow?.sent_at) continue;
    const anchor = new Date(earliestRow.sent_at);
    const elapsed = daysBetween(anchor, now);

    // Largest eligible bucket first. The shared sender dedups via
    // `email_send_log`, so already-sent buckets return
    // skipped_duplicate and we fall through to the next smaller day.
    let result: Awaited<ReturnType<typeof sendTransactional>> | null = null;
    let firedBucket: number | null = null;
    for (const day of retryDays) {
      if (elapsed < day) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", row.profile_id)
        .maybeSingle();
      const profileRow = profile as ProfileRow | null;
      if (!profileRow?.email) break;

      const attempt = await sendTransactional(supabase, resendConfig, {
        templateKey: "dunning",
        to: profileRow.email,
        triggerType: "automated",
        profileId: row.profile_id,
        referenceId: `${row.stripe_subscription_id}:${day}`,
        vars: {
          full_name: profileRow.full_name || "there",
          customer_portal_url: `${siteUrl}/dashboard/billing`,
        },
      });
      if (attempt.status !== "skipped_duplicate") {
        result = attempt;
        firedBucket = day;
        break;
      }
    }

    if (result && firedBucket !== null) {
      fired.push({
        profile_id: row.profile_id,
        day_bucket: firedBucket,
        status: result.status,
      });
    }
  }

  return json({
    ok: true,
    scanned: members?.length ?? 0,
    fired,
  });
});
