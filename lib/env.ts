/**
 * Centralized environment access. Never read `process.env` directly elsewhere —
 * import from here so the "never hardcode, never guess" rule has one home.
 *
 * `requireServerEnv` throws on a missing value so misconfiguration fails fast
 * at the call site rather than surfacing as a confusing runtime error later.
 */
function requireServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    get serviceRoleKey(): string {
      return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
    },
  },
} as const;
