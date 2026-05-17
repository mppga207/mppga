import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  PREVIEW_COOKIE,
  isPreviewMode,
  type PreviewMode,
} from "@/lib/supabase/preview";
import {
  SESSION_HEADER,
  deserializeSession,
} from "@/lib/supabase/session-header";
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

/**
 * Sentinel UUID used by the preview session. Data loaders check for this
 * id (or `!isSupabaseConfigured()`) to swap in mock fixtures so the
 * portal stays demoable before Supabase is provisioned. Never matches a
 * real auth.users id because Supabase issues v4 UUIDs with non-zero
 * version bits.
 */
export const PREVIEW_USER_ID = "00000000-0000-0000-0000-000000000000";

export function isPreviewSession(session: AppSession): boolean {
  return session.user.id === PREVIEW_USER_ID;
}

function buildPreviewSession(role: ProfileRole = "member"): AppSession {
  // Minimal User shape — we only ever read id / email off it. The rest
  // is filled in to satisfy the type without pretending to be a real
  // Supabase user.
  const user = {
    id: PREVIEW_USER_ID,
    email: "preview@mppga.example",
    app_metadata: { role, membership_status: "Active" },
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as unknown as User;
  return { user, role, membershipStatus: "Active" };
}

/**
 * Reads the `mppga-preview` cookie set by `/api/preview/[mode]`. When
 * present the request is in skip-auth demo mode — see
 * `lib/supabase/preview.ts` for the lifecycle.
 */
export async function readPreviewMode(): Promise<PreviewMode | null> {
  const store = await cookies();
  const value = store.get(PREVIEW_COOKIE)?.value;
  return isPreviewMode(value) ? value : null;
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
    : "Awaiting_Payment";
  return { role, membershipStatus };
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

/**
 * Reads the session forwarded by middleware in the x-mppga-session
 * header. Middleware has already verified the JWT via auth.getUser(),
 * so we trust the payload and skip a second Auth API round-trip.
 * Returns null when the header is absent (middleware didn't run, or
 * the user is anonymous) — callers fall through to the auth.getUser
 * path in that case.
 */
async function readSessionFromHeader(): Promise<AppSession | null> {
  const headerList = await headers();
  const raw = headerList.get(SESSION_HEADER);
  if (!raw) return null;
  const payload = deserializeSession(raw);
  if (!payload) return null;
  const user = {
    id: payload.id,
    email: payload.email ?? undefined,
    app_metadata: {
      role: payload.role,
      membership_status: payload.membershipStatus,
    },
    user_metadata: {},
    aud: payload.aud,
    created_at: payload.createdAt,
  } as unknown as User;
  return {
    user,
    role: payload.role,
    membershipStatus: payload.membershipStatus,
  };
}

/**
 * Returns the verified session for the current request, or null if the
 * user is anonymous. Fast path: middleware has already called
 * `auth.getUser()` and forwarded the result via the x-mppga-session
 * header, so we trust it. Slow path (header absent — e.g. an
 * unauthenticated visitor on a public page): falls through to
 * `auth.getUser()` so the JWT is verified against Supabase.
 *
 * Wrapped in `React.cache()` so Nav, page guards, and any nested
 * server components dedupe within a single render. Returns null when
 * Supabase isn't configured so callers can decide between
 * redirecting, rendering empty, or falling back to preview mode.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const preview = await readPreviewMode();
  if (preview) {
    return buildPreviewSession(preview === "admin" ? "admin" : "member");
  }
  const fromHeader = await readSessionFromHeader();
  if (fromHeader) return fromHeader;
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const { role, membershipStatus } = readClaims(data.user);
  return { user: data.user, role, membershipStatus };
});

/**
 * Requires an authenticated session. Anonymous callers are redirected to
 * `/sign-in?next=<original>` so they land back where they started.
 *
 * When Supabase isn't configured we return a preview session instead of
 * crashing on `createServerClient("", "")`. This keeps the temporary
 * sign-in preview buttons working before the backend is provisioned;
 * once env vars are set, the real auth path takes over.
 */
export async function requireSession(nextPath?: string): Promise<AppSession> {
  const preview = await readPreviewMode();
  if (preview) {
    return buildPreviewSession(preview === "admin" ? "admin" : "member");
  }
  if (!isSupabaseConfigured()) {
    return buildPreviewSession();
  }
  const session = await getSession();
  if (session) return session;
  const target = nextPath
    ? `/sign-in?next=${encodeURIComponent(nextPath)}`
    : "/sign-in";
  redirect(target);
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
    case "Awaiting_Payment":
      return "/dashboard/checkout";
  }
}
