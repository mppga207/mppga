import { NextResponse, type NextRequest } from "next/server";

import {
  createPendingMembership,
  type OwnedSalon,
} from "@/lib/membership/create-pending";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-verification callback per auth-middleware.md §6.2 / §6.1.
 *
 * - Exchanges the `code` query param for a session (cookies are written
 *   by the server client).
 * - For new joins, reads the metadata stashed by `joinMembership`
 *   (tier slug, contact details, salon affiliation or owned-salon
 *   payload) and creates the `memberships` row in `Awaiting_Payment`
 *   plus the owner's organization via the service role. The insert is
 *   idempotent on `profile_id`.
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
    const ownedSalon = readOwnedSalon(meta.owned_salon);
    const result = await createPendingMembership(
      data.user.id,
      tierSlug,
      { salonId, salonNewName, ownedSalon },
      {
        phone: readOptionalString(meta.phone),
        addressLine: readOptionalString(meta.address_line),
        city: readOptionalString(meta.city),
        zip: readOptionalString(meta.zip),
      },
    );
    if (result.status === "error") {
      console.error("createPendingMembership failed", result.reason);
    } else if (result.status === "unknown_tier") {
      console.error("createPendingMembership unknown tier", result.slug);
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

function readOptionalString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOwnedSalon(raw: unknown): OwnedSalon | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return undefined;
  return {
    name,
    address_line: readOptionalString(r.address_line),
    city: readOptionalString(r.city),
    zip: readOptionalString(r.zip),
    phone: readOptionalString(r.phone),
    website: readOptionalString(r.website),
  };
}
