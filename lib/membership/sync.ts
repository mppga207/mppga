import { env } from "@/lib/env";
import type { MembershipStatus } from "@/types/database";

/**
 * Calls the `membership-status-sync` Edge Function. The Edge Function
 * is the EXCLUSIVE writer for `memberships.status` (CLAUDE.md
 * constraint #2). Anything in the app that needs a status flip — Stripe
 * webhook handler (Track 3), admin status override (Track 6) — goes
 * through this helper, never a direct table write.
 */
export type SyncInvocation =
  | { mode: "single"; profileId: string; requestedStatus?: MembershipStatus; reason?: string }
  | { mode: "sweep" };

export interface SyncResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export async function invokeMembershipStatusSync(
  invocation: SyncInvocation,
): Promise<SyncResult> {
  const baseUrl = env.supabase.url;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set — cannot invoke Edge Function",
    );
  }
  const url = `${baseUrl.replace(/\/$/, "")}/functions/v1/membership-status-sync`;

  const body =
    invocation.mode === "sweep"
      ? { sweep: true }
      : {
          profile_id: invocation.profileId,
          requested_status: invocation.requestedStatus ?? null,
          reason: invocation.reason ?? null,
        };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // The Edge Function gates itself on this header matching the
      // service role key — see supabase/functions/membership-status-sync.
      Authorization: `Bearer ${env.supabase.secretKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // leave parsed as the raw text
  }

  return { ok: res.ok, status: res.status, body: parsed };
}
