import type { User } from "@supabase/supabase-js";

import type { MembershipStatus, ProfileRole } from "@/types/database";

/**
 * Internal request header set by middleware after it verifies the JWT
 * via `supabase.auth.getUser()`. Server components read this header
 * through `getSession()` to skip a second Auth API round-trip.
 *
 * Middleware always strips any inbound value before it sets its own
 * (see `updateSession` in `lib/supabase/middleware.ts`). A client
 * sending `x-mppga-session` directly is overwritten, so the header
 * is only trustworthy when it leaves middleware.
 */
export const SESSION_HEADER = "x-mppga-session";

export interface SerializedSession {
  id: string;
  email: string | null;
  role: ProfileRole;
  membershipStatus: MembershipStatus;
  aud: string;
  createdAt: string;
}

export function serializeSession(user: User): string {
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  const rawRole = meta?.role;
  const rawStatus = meta?.membership_status;
  const role: ProfileRole = rawRole === "admin" ? "admin" : "member";
  const membershipStatus = isMembershipStatus(rawStatus)
    ? rawStatus
    : "Awaiting_Payment";
  const payload: SerializedSession = {
    id: user.id,
    email: user.email ?? null,
    role,
    membershipStatus,
    aud: user.aud,
    createdAt: user.created_at,
  };
  return JSON.stringify(payload);
}

export function deserializeSession(value: string): SerializedSession | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.id !== "string") return null;
    if (typeof obj.aud !== "string") return null;
    if (typeof obj.createdAt !== "string") return null;
    const email = typeof obj.email === "string" ? obj.email : null;
    const role: ProfileRole = obj.role === "admin" ? "admin" : "member";
    const membershipStatus = isMembershipStatus(obj.membershipStatus)
      ? obj.membershipStatus
      : "Awaiting_Payment";
    return {
      id: obj.id,
      email,
      role,
      membershipStatus,
      aud: obj.aud,
      createdAt: obj.createdAt,
    };
  } catch {
    return null;
  }
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    value === "Awaiting_Payment" ||
    value === "Active" ||
    value === "Grace_Period" ||
    value === "Lapsed" ||
    value === "Suspended" ||
    value === "Honorary"
  );
}
