// Supabase Edge Function (Deno runtime).
//
// Nightly cleanup for stale pending event registrations + waitlist
// promotion per `events.md` §5 and `stripe-architecture.md` §8.2.
//
// What it does:
//   1. Reads `email_settings.waitlist_payment_link_expiry_hours`.
//   2. Calls `expire_stale_pending_registrations(p_expiry_hours)` to
//      cancel pending registrations older than the configured cutoff.
//      The function flips them to `cancelled` and returns the
//      affected event ids.
//   3. For each distinct event id, calls `promote_next_waitlisted`.
//      A waitlisted member becoming confirmed fires its own follow-up
//      email — see below.
//
// Email sends:
//   - Promotion email is sent here for the free-event case
//     (`waitlist-promoted-payment` is not appropriate; we reuse the
//     `event-confirmation` template).
//   - For paid promotions the function calls back into the same
//     `promote_next_waitlisted` RPC, but the email needs a fresh
//     Stripe Checkout URL — we can't create one in Deno without
//     bundling the Stripe SDK. Track 7's policy is to leave the paid
//     promotion email to the next cron pass OR have the admin manually
//     re-send via the admin Emails tab. For now, log the
//     "needs_paid_followup" event so the audit shows what was deferred.
//
// AuthN: Authorization header against SERVICE_ROLE_KEY — same pattern
// as `dunning-cron` and `membership-status-sync`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  resendConfigFromEnv,
  sendTransactional,
} from "../_shared/email-send.ts";

interface ExpiredRow {
  registration_id: string;
  event_id: string;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface ProfileRow {
  email: string;
  full_name: string;
}

interface PromotedRow {
  id: string;
  profile_id: string;
  payment_status: string;
  price_paid: number;
}

interface EmailSettingsRow {
  waitlist_payment_link_expiry_hours: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

  const { data: settings, error: settingsError } = await supabase
    .from("email_settings")
    .select("waitlist_payment_link_expiry_hours")
    .limit(1)
    .maybeSingle();
  if (settingsError) return json({ error: settingsError.message }, 500);
  const expiryHours =
    (settings as EmailSettingsRow | null)?.waitlist_payment_link_expiry_hours ??
    24;

  const { data: expired, error: expireError } = await supabase.rpc(
    "expire_stale_pending_registrations",
    { p_expiry_hours: expiryHours },
  );
  if (expireError) return json({ error: expireError.message }, 500);

  const expiredRows = (expired ?? []) as ExpiredRow[];
  const affectedEventIds = Array.from(
    new Set(expiredRows.map((r) => r.event_id)),
  );

  const promotions: Array<{
    event_id: string;
    registration_id: string;
    payment_status: string;
    notified: boolean;
  }> = [];

  for (const eventId of affectedEventIds) {
    const { data: promoted, error: promoteError } = await supabase.rpc(
      "promote_next_waitlisted",
      { p_event_id: eventId },
    );
    if (promoteError) {
      console.error("promote_next_waitlisted failed", eventId, promoteError);
      continue;
    }
    if (!promoted) continue;
    const promotedRow = promoted as PromotedRow;

    const { data: event } = await supabase
      .from("events")
      .select("id, title, date, location")
      .eq("id", eventId)
      .maybeSingle();
    const eventRow = event as EventRow | null;
    if (!eventRow) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", promotedRow.profile_id)
      .maybeSingle();
    const profileRow = profile as ProfileRow | null;
    if (!profileRow?.email) continue;

    let notified = false;
    if (promotedRow.payment_status === "free") {
      const result = await sendTransactional(supabase, resendConfig, {
        templateKey: "event-confirmation",
        to: profileRow.email,
        triggerType: "automated",
        profileId: promotedRow.profile_id,
        referenceId: promotedRow.id,
        vars: {
          full_name: profileRow.full_name || profileRow.email,
          event_title: eventRow.title,
          event_date: eventRow.date,
          event_location: eventRow.location,
          amount_paid: "Free",
        },
      });
      notified = result.status === "sent";
    } else {
      // Paid promotion email needs a Stripe Checkout URL. Creating one
      // requires Node + Stripe SDK — defer to the Node-side promotion
      // helper (server action / admin action). For now, log so the
      // audit trail shows the unfulfilled follow-up.
      console.info(
        "waitlist-promoted-paid: needs follow-up checkout email",
        promotedRow.id,
      );
    }

    promotions.push({
      event_id: eventId,
      registration_id: promotedRow.id,
      payment_status: promotedRow.payment_status,
      notified,
    });
  }

  return json({
    ok: true,
    expired: expiredRows.length,
    promoted: promotions.length,
    promotions,
  });
});
