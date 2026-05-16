import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { MembershipStatus, ProfileRole } from "@/types/database";

/**
 * The handful of fields server code actually reads off the JWT.
 * `role` and `membership_status` come from the custom-claims hook in
 * `supabase/migrations/20260516000006_auth_jwt_claims_hook.sql`.
 */
export interface AppSession {
  user: User;
  role: ProfileRole;
  membershipStatus: MembershipStatus;
}

function readClaims(user: User): {
  role: ProfileRole;
  membershipStatus: MembershipStatus;
} {
  // app_metadata is server-controlled; user_metadata is user-writable and
  // must never be trusted for authorization (auth-middleware.md §4.4).
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  const rawRole = meta?.role;
  const rawStatus = meta?.membership_status;
  const role: ProfileRole = rawRole === "admin" ? "admin" : "member";
  const membershipStatus: MembershipStatus = isMembershipStatus(rawStatus)
    ? rawStatus
    : "Pending_Approval";
  return { role, membershipStatus };
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    value === "Pending_Approval" ||
    value === "Awaiting_Payment" ||
    value === "Active" ||
    value === "Grace_Period" ||
    value === "Lapsed" ||
    value === "Suspended" ||
    value === "Honorary"
  );
}

/**
 * Returns the verified session for the current request, or null if the
 * user is anonymous. Uses `auth.getUser()` so the JWT is re-verified
 * against Supabase rather than trusted from the cookie alone.
 */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const { role, membershipStatus } = readClaims(data.user);
  return { user: data.user, role, membershipStatus };
}

/**
 * Requires an authenticated session. Anonymous callers are redirected to
 * `/sign-in?next=<original>` so they land back where they started.
 */
export async function requireSession(nextPath?: string): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    const target = nextPath
      ? `/sign-in?next=${encodeURIComponent(nextPath)}`
      : "/sign-in";
    redirect(target);
  }
  return session;
}

/**
 * Requires an admin session. Non-admins are redirected to `/dashboard`
 * (never a generic 403 — CLAUDE.md constraint #7).
 */
export async function requireAdmin(nextPath?: string): Promise<AppSession> {
  const session = await requireSession(nextPath);
  if (session.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Requires a member session that can access the member portal — i.e. the
 * status is one of `Active`, `Honorary`, or `Grace_Period`. Other statuses
 * redirect per auth-middleware.md §3.1.
 */
export async function requireMember(nextPath?: string): Promise<AppSession> {
  const session = await requireSession(nextPath);
  const destination = redirectForStatus(session.membershipStatus);
  if (destination) {
    redirect(destination);
  }
  return session;
}

/**
 * Returns the path to redirect to for a given membership status when the
 * caller is attempting to use the member portal, or null when access is
 * permitted. Exposed so middleware can share the policy.
 */
export function redirectForStatus(status: MembershipStatus): string | null {
  switch (status) {
    case "Active":
    case "Honorary":
    case "Grace_Period":
      return null;
    case "Lapsed":
      return "/renew";
    case "Suspended":
      return "/renew?reason=suspended";
    case "Pending_Approval":
      return "/dashboard/pending";
    case "Awaiting_Payment":
      return "/dashboard/checkout";
  }
}
