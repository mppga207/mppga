import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh helper invoked from the root `middleware.ts`.
 *
 * TODO(auth-middleware.md): refresh the Supabase session, then enforce route
 * protection by membership status — Lapsed users redirect to /renew (never a
 * generic 403), Grace_Period users get read-only access, etc. For now this is
 * a pass-through so the wiring exists without behavior.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  return NextResponse.next({ request });
}
