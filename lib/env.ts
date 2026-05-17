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

// Vercel exposes VERCEL_URL (per-deployment) and VERCEL_PROJECT_PRODUCTION_URL
// (stable production domain) without a protocol. Falls back to localhost for
// `pnpm dev`.
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

export const env = {
  siteUrl: resolveSiteUrl(),

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    get secretKey(): string {
      return requireServerEnv("SUPABASE_SECRET_KEY");
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
    // From-address defaults to a stopgap on the Afterload domain while
    // MPPGA's production domain is being sorted. Resend requires a
    // domain-verified address; `afterload.io` is the only verified
    // domain available pre-launch. Replies route to the board's Gmail
    // via the Reply-To header, which `lib/email/send.ts` pulls from
    // `site_settings.contact_email` so an admin edit propagates without
    // a code change.
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "afterchaos@afterload.io",
    fromName:
      process.env.RESEND_FROM_NAME ?? "Maine Professional Pet Groomers Association",
  },
} as const;
