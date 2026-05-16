// Supabase Edge Function (Deno runtime).
//
// Renewal reminders per `email-automation.md` §3.2.
//
// Daily cron. For each day-offset N in
// `email_settings.renewal_reminder_days_before` (default [30, 7, 1]),
// finds Active memberships whose `expires_at` falls on
// `now() + N days` (date-only comparison, server timezone). Fires the
// `renewal-reminder` template, deduped on
// `(profile_id, 'renewal-reminder', subscription_id:N)`.
//
// AuthN: matches `membership-status-sync` / `dunning-cron`. Service
// role key required in the Authorization header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  resendConfigFromEnv,
  sendTransactional,
} from "../_shared/email-send.ts";

interface MembershipRow {
  id: string;
  profile_id: string;
  tier_id: string;
  status: string;
  expires_at: string | null;
  stripe_subscription_id: string | null;
}

interface ProfileRow {
  email: string;
  full_name: string;
}

interface TierRow {
  name: string;
}

interface SettingsRow {
  renewal_reminder_days_before: number[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateOnlyIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateLong(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) return json({ error: "missing_env" }, 500);

  if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resendConfig = resendConfigFromEnv();

  const { data: settings, error: settingsError } = await supabase
    .from("email_settings")
    .select("renewal_reminder_days_before")
    .limit(1)
    .maybeSingle();
  if (settingsError) return json({ error: settingsError.message }, 500);
  const offsets =
    (settings as SettingsRow | null)?.renewal_reminder_days_before ?? [30, 7, 1];

  const today = startOfUtcDay(new Date());
  const fired: Array<{ profile_id: string; offset: number; status: string }> = [];

  for (const offset of offsets) {
    const target = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);
    const dayStartIso = target.toISOString();
    const dayEnd = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    const dayEndIso = dayEnd.toISOString();

    const { data: members, error: membersError } = await supabase
      .from("memberships")
      .select(
        "id, profile_id, tier_id, status, expires_at, stripe_subscription_id",
      )
      .eq("status", "Active")
      .gte("expires_at", dayStartIso)
      .lt("expires_at", dayEndIso);
    if (membersError) return json({ error: membersError.message }, 500);

    for (const row of (members ?? []) as MembershipRow[]) {
      if (!row.stripe_subscription_id) continue;

      const [{ data: profile }, { data: tier }] = await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", row.profile_id)
          .maybeSingle(),
        supabase
          .from("tiers")
          .select("name")
          .eq("id", row.tier_id)
          .maybeSingle(),
      ]);

      const profileRow = profile as ProfileRow | null;
      if (!profileRow?.email) continue;

      const tierRow = tier as TierRow | null;
      const referenceId = `${row.stripe_subscription_id}:${dateOnlyIso(target)}:${offset}`;

      const result = await sendTransactional(supabase, resendConfig, {
        templateKey: "renewal-reminder",
        to: profileRow.email,
        triggerType: "automated",
        profileId: row.profile_id,
        referenceId,
        vars: {
          full_name: profileRow.full_name || "there",
          tier_name: tierRow?.name ?? "MPPGA",
          days_remaining: offset,
          expires_at: formatDateLong(row.expires_at),
        },
      });

      fired.push({
        profile_id: row.profile_id,
        offset,
        status: result.status,
      });
    }
  }

  return json({ ok: true, fired });
});
