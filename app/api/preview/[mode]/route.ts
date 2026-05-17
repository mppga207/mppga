import { NextResponse } from "next/server";

import { PREVIEW_COOKIE, isPreviewMode } from "@/lib/supabase/preview";

/**
 * Temporary skip-auth entry point used by the preview buttons on
 * `/sign-in`. Sets a server-side cookie so middleware + the session
 * helpers treat the visitor as a synthetic member or admin and route
 * them straight into the portal.
 *
 * Idempotent + read-via-GET so it can be hit from a plain anchor (no
 * client-side bundle needed). Lifespan is short so an abandoned demo
 * session doesn't linger.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mode: string }> },
) {
  const { mode } = await params;
  if (!isPreviewMode(mode)) {
    return NextResponse.redirect(new URL("/sign-in", _request.url));
  }
  const target = mode === "admin" ? "/admin" : "/dashboard";
  const response = NextResponse.redirect(new URL(target, _request.url));
  response.cookies.set(PREVIEW_COOKIE, mode, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4,
  });
  return response;
}
