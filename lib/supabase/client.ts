import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client for use in client components.
 *
 * TODO(auth-middleware.md): custom JWT claim handling (role, membership_status)
 * is layered on in the auth milestone.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.supabase.url,
    env.supabase.publishableKey,
  );
}
