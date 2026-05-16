import Stripe from "stripe";

import { env } from "@/lib/env";

/**
 * Single Stripe SDK instance. Server-only — the secret key must never reach
 * the client (`stripe-architecture.md` §10). Construct lazily so importing
 * this module from a build-time context doesn't throw before the env is
 * provisioned.
 */
let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (!cached) {
    cached = new Stripe(env.stripe.secretKey, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
      appInfo: { name: "mppga", version: "1.0.0" },
    });
  }
  return cached;
}
