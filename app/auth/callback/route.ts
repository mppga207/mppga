import { NextResponse, type NextRequest } from "next/server";

import { createPendingMembership } from "@/lib/membership/create-pending";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-verification callback per auth-middleware.md §6.2 / §6.1.
 *
 * - Exchanges the `code` query param for a session (cookies are written
 *   by the server client).
 * - For new joins, reads `user_metadata.tier_slug` and creates the
 *   `memberships` row in `Awaiting_Payment` via the service role. The
 *   tier slug was stashed server-side by `joinMembership` before the
 *   email was sent, and the insert is idempotent on `profile_id`.
 * - Redirects to `next` (default `/dashboard`). Middleware then routes
 *   the user to `/dashboard/checkout` while their status is
 *   `Awaiting_Payment`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=missing_code`, request.url),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=exchange_failed`, request.url),
    );
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const tierSlug = typeof meta.tier_slug === "string" ? meta.tier_slug : null;
  if (tierSlug) {
    const salonId =
      typeof meta.salon_id === "string" && meta.salon_id.length > 0
        ? meta.salon_id
        : undefined;
    const salonNewName =
      typeof meta.salon_new_name === "string" && meta.salon_new_name.length > 0
        ? meta.salon_new_name
        : undefined;
    const result = await createPendingMembership(data.user.id, tierSlug, {
      salonId,
      salonNewName,
    });
    if (result.status === "error") {
      console.error("createPendingMembership failed", result.reason);
    } else if (result.status === "unknown_tier") {
      console.error("createPendingMembership unknown tier", result.slug);
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
