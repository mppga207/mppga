// Supabase Edge Function (Deno runtime).
//
// Event reminders per `email-automation.md` §3.8.
//
// Hourly cron. For each hour-offset N in
// `email_settings.event_reminder_hours_before` (default [48, 2]),
// finds published events whose `date` is within ±30 minutes of
// `now() + N hours`. For each confirmed registration on those events,
// fires the `event-reminder` template, deduped on
// `(profile_id, 'event-reminder', event_id:N)`.
//
// Event ticketing wiring (Track 7) creates the `event_registrations`
// rows this cron reads. The cron itself is ready to ship without
// waiting on Track 7 — it just yields zero fires until registrations
// exist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  resendConfigFromEnv,
  sendTransactional,
} from "../_shared/email-send.ts";

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
}

interface RegistrationRow {
  id: string;
  profile_id: string;
  event_id: string;
  status: string;
  payment_status: string;
}

interface ProfileRow {
  email: string;
  full_name: string;
}

interface SettingsRow {
  event_reminder_hours_before: number[];
}

const WINDOW_MINUTES = 30;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
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
    .select("event_reminder_hours_before")
    .limit(1)
    .maybeSingle();
  if (settingsError) return json({ error: settingsError.message }, 500);
  const offsets =
    (settings as SettingsRow | null)?.event_reminder_hours_before ?? [48, 2];

  const now = new Date();
  const fired: Array<{ event_id: string; profile_id: string; offset: number; status: string }> = [];

  for (const hours of offsets) {
    const center = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const windowStart = new Date(
      center.getTime() - WINDOW_MINUTES * 60 * 1000,
    );
    const windowEnd = new Date(center.getTime() + WINDOW_MINUTES * 60 * 1000);

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, date, location, status")
      .eq("status", "published")
      .gte("date", windowStart.toISOString())
      .lt("date", windowEnd.toISOString());
    if (eventsError) return json({ error: eventsError.message }, 500);

    for (const event of (events ?? []) as EventRow[]) {
      const { data: regs, error: regsError } = await supabase
        .from("event_registrations")
        .select("id, profile_id, event_id, status, payment_status")
        .eq("event_id", event.id)
        .eq("status", "confirmed");
      if (regsError) return json({ error: regsError.message }, 500);

      for (const reg of (regs ?? []) as RegistrationRow[]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", reg.profile_id)
          .maybeSingle();
        const profileRow = profile as ProfileRow | null;
        if (!profileRow?.email) continue;

        const result = await sendTransactional(supabase, resendConfig, {
          templateKey: "event-reminder",
          to: profileRow.email,
          triggerType: "automated",
          profileId: reg.profile_id,
          referenceId: `${event.id}:${hours}`,
          vars: {
            full_name: profileRow.full_name || "there",
            event_title: event.title,
            event_date: formatDateTime(event.date),
            event_location: event.location,
          },
        });

        fired.push({
          event_id: event.id,
          profile_id: reg.profile_id,
          offset: hours,
          status: result.status,
        });
      }
    }
  }

  return json({ ok: true, fired });
});
