import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database, MembershipStatus, ProfileRole } from "@/types/database";

/**
 * Route protection matrix per auth-middleware.md §3.
 *
 * Refreshes the Supabase session cookie on every request, reads `role`
 * and `membership_status` off the JWT app_metadata (set by the
 * custom-claims hook), and redirects per the matrix. Never queries the
 * database; never returns a generic 403.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() re-verifies the JWT against Supabase and refreshes the
  // cookie when it's near expiry. Never use getSession() in middleware.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = request.nextUrl.pathname;

  const redirectTarget = decideRedirect(user, pathname);
  if (redirectTarget && redirectTarget !== pathname) {
    const url = request.nextUrl.clone();
    const [path, query] = redirectTarget.split("?", 2);
    url.pathname = path ?? redirectTarget;
    url.search = query ? `?${query}` : "";
    if (path === "/sign-in") {
      url.searchParams.set("next", pathname);
    }
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

function decideRedirect(user: User | null, pathname: string): string | null {
  const isAdmin = readRole(user) === "admin";
  const status = readMembershipStatus(user);

  if (isPublicPath(pathname)) {
    // Signed-in users on /sign-in get bounced — they don't need a login form.
    if (user && pathname === "/sign-in") {
      return isAdmin ? "/admin" : memberLandingForStatus(status);
    }
    return null;
  }

  // Webhooks + auth callback handle their own gating.
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return null;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user) return "/sign-in";
    if (!isAdmin) return "/dashboard";
    return null;
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!user) return "/sign-in";
    if (pathname === "/dashboard/pending" && status === "Pending_Approval") {
      return null;
    }
    if (pathname === "/dashboard/checkout" && status === "Awaiting_Payment") {
      return null;
    }
    return redirectForDashboardStatus(status);
  }

  if (pathname === "/renew") {
    if (!user) return "/sign-in";
    return null;
  }

  // Anything else outside the matrix is treated as public.
  return null;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/about") return true;
  if (pathname === "/contact") return true;
  if (pathname === "/join") return true;
  if (pathname === "/sign-in") return true;
  if (pathname === "/events") return true;
  // /events/[id] and /events/[id]/confirmation are public-facing; the
  // confirmation page renders a 404 for non-owners (auth-middleware.md §3.2).
  if (pathname.startsWith("/events/")) return true;
  return false;
}

function memberLandingForStatus(status: MembershipStatus): string {
  switch (status) {
    case "Pending_Approval":
      return "/dashboard/pending";
    case "Awaiting_Payment":
      return "/dashboard/checkout";
    case "Lapsed":
      return "/renew";
    case "Suspended":
      return "/renew?reason=suspended";
    default:
      return "/dashboard";
  }
}

function redirectForDashboardStatus(status: MembershipStatus): string | null {
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

function readRole(user: User | null): ProfileRole {
  if (!user) return "member";
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  return meta?.role === "admin" ? "admin" : "member";
}

function readMembershipStatus(user: User | null): MembershipStatus {
  if (!user) return "Pending_Approval";
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  const value = meta?.membership_status;
  if (
    value === "Pending_Approval" ||
    value === "Awaiting_Payment" ||
    value === "Active" ||
    value === "Grace_Period" ||
    value === "Lapsed" ||
    value === "Suspended" ||
    value === "Honorary"
  ) {
    return value;
  }
  return "Pending_Approval";
}
