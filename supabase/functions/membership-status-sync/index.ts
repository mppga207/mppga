// Supabase Edge Function (Deno runtime).
//
// EXCLUSIVE writer for `memberships.status` (CLAUDE.md constraint #2).
// Two invocation modes:
//
//   { profile_id, requested_status?: MembershipStatus, reason? }
//     Apply a status transition to a single member. If `requested_status`
//     is omitted, the function runs the time-based check for that member
//     (Active + expires_at past → Grace_Period or Lapsed). With
//     `requested_status` set, it applies the admin override after
//     validating the destination value.
//
//   { sweep: true }
//     Walk every Active / Grace_Period membership and apply time-based
//     transitions in bulk. Intended for the daily cron — never called
//     from app code.
//
// Time-based transitions per CLAUDE.md §4:
//   Active        + expires_at < now + 0  → Grace_Period
//   Grace_Period  + expires_at < now - 30d → Lapsed
//   Active        + expires_at < now - 30d → Lapsed (skips Grace_Period
//                                                    if the cron missed
//                                                    the grace window)
//
// After every write, `auth.admin.signOut(user_id, 'others')` is called
// so the next request from the affected user picks up a fresh JWT with
// the new membership_status claim (auth-middleware.md §2.2).
//
// AuthN: `verify_jwt = false` in supabase/config.toml. The function
// gates itself by matching the Authorization header against the service
// role key. Only callers that already have the service role key (the
// Stripe webhook handler, Next.js admin server actions, scheduled
// crons) can reach it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type MembershipStatus =
  | "Awaiting_Payment"
  | "Active"
  | "Grace_Period"
  | "Lapsed"
  | "Suspended"
  | "Honorary";

const ALLOWED_STATUSES: ReadonlySet<MembershipStatus> = new Set([
  "Awaiting_Payment",
  "Active",
  "Grace_Period",
  "Lapsed",
  "Suspended",
  "Honorary",
]);

const GRACE_PERIOD_DAYS = 30;

interface MembershipRow {
  id: string;
  profile_id: string;
  status: MembershipStatus;
  expires_at: string | null;
}

interface SinglePayload {
  profile_id: string;
  requested_status?: MembershipStatus | null;
  reason?: string | null;
}

interface SweepPayload {
  sweep: true;
}

type Payload = SinglePayload | SweepPayload;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isSweep(p: Payload): p is SweepPayload {
  return (p as SweepPayload).sweep === true;
}

function decideTimeBasedTransition(
  row: MembershipRow,
  now: Date,
): MembershipStatus | null {
  if (!row.expires_at) return null;
  if (row.status !== "Active" && row.status !== "Grace_Period") return null;

  const expires = new Date(row.expires_at);
  const graceCutoff = new Date(
    expires.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  if (now >= graceCutoff) {
    return row.status === "Lapsed" ? null : "Lapsed";
  }
  if (now >= expires && row.status === "Active") {
    return "Grace_Period";
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) {
    return json({ error: "missing_env" }, 500);
  }

  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${serviceKey}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();

  if (isSweep(payload)) {
    const { data: rows, error } = await supabase
      .from("memberships")
      .select("id, profile_id, status, expires_at")
      .in("status", ["Active", "Grace_Period"]);
    if (error) return json({ error: error.message }, 500);

    const transitions: Array<{
      profile_id: string;
      from: MembershipStatus;
      to: MembershipStatus;
    }> = [];

    for (const row of (rows ?? []) as MembershipRow[]) {
      const next = decideTimeBasedTransition(row, now);
      if (!next) continue;

      const { error: updateError } = await supabase
        .from("memberships")
        .update({ status: next })
        .eq("id", row.id);
      if (updateError) {
        return json({ error: updateError.message }, 500);
      }
      transitions.push({
        profile_id: row.profile_id,
        from: row.status,
        to: next,
      });
      await supabase.auth.admin.signOut(row.profile_id, "others");
    }

    return json({ ok: true, swept: rows?.length ?? 0, transitions });
  }

  const { profile_id, requested_status } = payload;
  if (!profile_id) return json({ error: "missing_profile_id" }, 400);

  if (requested_status && !ALLOWED_STATUSES.has(requested_status)) {
    return json({ error: "invalid_requested_status" }, 400);
  }

  const { data: row, error } = await supabase
    .from("memberships")
    .select("id, profile_id, status, expires_at")
    .eq("profile_id", profile_id)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!row) return json({ error: "membership_not_found" }, 404);

  const current = row as MembershipRow;
  const nextStatus: MembershipStatus | null = requested_status
    ? requested_status
    : decideTimeBasedTransition(current, now);

  if (!nextStatus || nextStatus === current.status) {
    return json({ ok: true, changed: false, status: current.status });
  }

  const { error: updateError } = await supabase
    .from("memberships")
    .update({ status: nextStatus })
    .eq("id", current.id);
  if (updateError) return json({ error: updateError.message }, 500);

  await supabase.auth.admin.signOut(current.profile_id, "others");

  return json({
    ok: true,
    changed: true,
    from: current.status,
    to: nextStatus,
  });
});
