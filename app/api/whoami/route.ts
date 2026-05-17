import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint. Returns the JWT claims the server sees for the
 * current cookie, so we can tell at a glance whether the custom-claims
 * hook is actually populating `app_metadata.role` for this session.
 *
 * Safe to leave wired up: it only ever returns the current user's own
 * claims, never anyone else's.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return NextResponse.json({
    signed_in: data.user !== null,
    user_id: data.user?.id ?? null,
    email: data.user?.email ?? null,
    app_metadata: data.user?.app_metadata ?? null,
    user_metadata: data.user?.user_metadata ?? null,
  });
}
