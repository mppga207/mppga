import "server-only";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Returns a Stripe Customer Portal session URL for the given member per
 * `stripe-architecture.md` §7. The portal handles card updates, invoice
 * history download, and self-serve cancellation — we never build custom
 * UI for any of those.
 *
 * Members without a `stripe_customer_id` (Awaiting_Payment, Honorary)
 * cannot use the portal — the caller is responsible for hiding the link
 * for those statuses.
 */
export type CustomerPortalResult =
  | { status: "ok"; url: string }
  | { status: "no_customer" }
  | { status: "missing_membership" }
  | { status: "error"; reason: string };

export async function createCustomerPortalSession(
  profileId: string,
): Promise<CustomerPortalResult> {
  const supabase = createServiceRoleClient();

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    return { status: "error", reason: error.message };
  }
  if (!membership) {
    return { status: "missing_membership" };
  }
  if (!membership.stripe_customer_id) {
    return { status: "no_customer" };
  }

  const stripe = getStripe();
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id,
      return_url: `${env.siteUrl}/dashboard/billing`,
    });
    return { status: "ok", url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_stripe_error";
    return { status: "error", reason: message };
  }
}
