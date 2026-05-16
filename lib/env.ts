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

  stripe: {
    get secretKey(): string {
      return requireServerEnv("STRIPE_SECRET_KEY");
    },
    get webhookSecret(): string {
      return requireServerEnv("STRIPE_WEBHOOK_SECRET");
    },
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  },

  resend: {
    get apiKey(): string {
      return requireServerEnv("RESEND_API_KEY");
    },
    // From-address defaults to the client-confirmed sender. Resend
    // requires a domain-verified address in production; for local / CI
    // runs without a verified domain, sends will surface a Resend-side
    // error.
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "mppga207@gmail.com",
    fromName:
      process.env.RESEND_FROM_NAME ?? "Maine Professional Pet Groomers Association",
  },
} as const;
