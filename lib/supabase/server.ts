import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * True only when the Supabase URL + anon key are present. When false,
 * the portal pages render in "preview mode" with placeholder data so
 * the prototype is still demoable without a provisioned backend.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.publishableKey);
}

/**
 * Server-side Supabase client for server components and route handlers.
 * Reads/writes the session via Next's cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` can be called from a server component, where cookies are
          // read-only. Safe to ignore when middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Privileged server-only client that bypasses RLS via the service role key.
 * Use ONLY in trusted server contexts (webhooks, edge-triggered jobs) — never
 * in response to unauthenticated input without explicit checks.
 *
 * TODO(stripe-architecture.md / data-model.md): consumed by the webhook
 * handler and membership-status-sync once those land.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    env.supabase.url,
    env.supabase.secretKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
