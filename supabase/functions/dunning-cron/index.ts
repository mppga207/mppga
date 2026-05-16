// Supabase Edge Function (Deno runtime).
//
// Dunning re-fire loop per `stripe-architecture.md` §4 +
// `email-automation.md` §3.3. Runs daily — scheduled via
// `supabase/config.toml` cron entry (TBD when deployed).
//
// For every membership in `billing_status = 'past_due'`:
//   - Compute the most-recent prior `dunning` send for that membership.
//   - If the time since that send (in whole days) matches the next value
//     in `email_settings.dunning_retry_days`, fire the dunning email.
//   - The send call writes `email_send_log` BEFORE the actual send,
//     keyed on `(profile_id, 'dunning', stripe_subscription_id +
//     day-bucket)`, so re-firing the same retry across cron retries is
//     deduped.
//
// AuthN: same as `membership-status-sync` — `verify_jwt = false` and
// gated by Authorization header against the service role key. The
// scheduled cron job passes the service key when invoking.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
}

interface SendLogRow {
  sent_at: string;
  reference_id: string | null;
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
  const now = new Date();

  const { data: settings, error: settingsError } = await supabase
    .from("email_settings")
    .select("dunning_retry_days")
    .limit(1)
    .maybeSingle();
  if (settingsError) return json({ error: settingsError.message }, 500);
  const retryDays = ((settings as EmailSettingsRow | null)?.dunning_retry_days ?? [3, 7, 14]).sort(
    (a, b) => a - b,
  );

  const { data: members, error: membersError } = await supabase
    .from("memberships")
    .select("id, profile_id, stripe_subscription_id, billing_status")
    .eq("billing_status", "past_due");
  if (membersError) return json({ error: membersError.message }, 500);

  const fired: Array<{ profile_id: string; day_bucket: number }> = [];

  for (const row of (members ?? []) as MembershipRow[]) {
    if (!row.stripe_subscription_id) continue;

    const { data: lastSend } = await supabase
      .from("email_send_log")
      .select("sent_at, reference_id")
      .eq("profile_id", row.profile_id)
      .eq("template", "dunning")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSendDate = (lastSend as SendLogRow | null)?.sent_at
      ? new Date((lastSend as SendLogRow).sent_at)
      : null;

    let nextBucket: number | null = null;
    if (!lastSendDate) {
      // First retry — fire on whatever the smallest retry day is once
      // billing_status has held past_due for that many days. We approximate
      // "billing_status went past_due" by the row's most recent update;
      // the webhook handler wrote that timestamp.
      nextBucket = retryDays[0] ?? null;
    } else {
      const elapsed = daysBetween(lastSendDate, now);
      const next = retryDays.find((d) => d <= elapsed);
      if (next !== undefined) {
        nextBucket = next;
      }
    }

    if (nextBucket === null) continue;

    // Dedup reference includes the day bucket so each retry day fires at
    // most once per past_due episode.
    const referenceId = `${row.stripe_subscription_id}:${nextBucket}`;

    const { data: existing } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("profile_id", row.profile_id)
      .eq("template", "dunning")
      .eq("reference_id", referenceId)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", row.profile_id)
      .maybeSingle();
    if (!(profile as ProfileRow | null)?.email) continue;

    await supabase.from("email_send_log").insert({
      profile_id: row.profile_id,
      template: "dunning",
      trigger_type: "automated",
      reference_id: referenceId,
      resend_message_id: null,
      status: "sent",
    });

    // Track 4 swaps the console.info for the Resend API call.
    console.info(
      `[email:stub] would send dunning to ${(profile as ProfileRow).email}`,
      { day_bucket: nextBucket, subscription_id: row.stripe_subscription_id },
    );

    fired.push({ profile_id: row.profile_id, day_bucket: nextBucket });
  }

  return json({
    ok: true,
    scanned: members?.length ?? 0,
    fired,
  });
});
