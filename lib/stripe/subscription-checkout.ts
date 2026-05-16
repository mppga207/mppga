import "server-only";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Creates a Stripe Checkout session in `mode: 'subscription'` for a member's
 * initial dues payment (or renewal kick-off) per `stripe-architecture.md`
 * §6.1.
 *
 * Inputs:
 *   - profileId: the signed-in member
 *
 * Pre-conditions:
 *   - The member has a `memberships` row (created by `/auth/callback`).
 *   - The membership's tier has a non-null `stripe_price_id`. Tier prices
 *     are seeded by `seedTierPrice` in `lib/stripe/tier-price-update.ts`
 *     once Stripe credentials are available.
 *
 * Returns the URL to redirect the user to.
 *
 * Service-role required: reads `memberships` + `tiers` for a specific
 * profile across RLS boundaries before signing the Checkout request.
 */
export type SubscriptionCheckoutResult =
  | { status: "ok"; url: string }
  | { status: "missing_membership" }
  | { status: "missing_price"; tierId: string }
  | { status: "error"; reason: string };

export async function createSubscriptionCheckoutSession(
  profileId: string,
): Promise<SubscriptionCheckoutResult> {
  const supabase = createServiceRoleClient();

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, profile_id, tier_id, stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (membershipError) {
    return { status: "error", reason: membershipError.message };
  }
  if (!membership) {
    return { status: "missing_membership" };
  }

  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, stripe_price_id")
    .eq("id", membership.tier_id)
    .maybeSingle();
  if (tierError) {
    return { status: "error", reason: tierError.message };
  }
  if (!tier || !tier.stripe_price_id) {
    return { status: "missing_price", tierId: membership.tier_id };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    return { status: "error", reason: profileError.message };
  }

  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${env.siteUrl}/dashboard?checkout=success`,
      cancel_url: `${env.siteUrl}/dashboard/checkout?checkout=cancelled`,
      // Re-use the existing Stripe Customer when the member has one
      // (renewal kick-off, retry after a cancel); otherwise let Checkout
      // create one and we'll pick up `session.customer` in the webhook.
      ...(membership.stripe_customer_id
        ? { customer: membership.stripe_customer_id }
        : profile?.email
          ? { customer_email: profile.email }
          : {}),
      client_reference_id: profileId,
      metadata: {
        flow: "billing",
        profile_id: profileId,
        tier_id: tier.id,
        membership_id: membership.id,
      },
      subscription_data: {
        metadata: {
          profile_id: profileId,
          tier_id: tier.id,
          membership_id: membership.id,
        },
      },
    });

    if (!session.url) {
      return { status: "error", reason: "stripe_returned_no_url" };
    }
    return { status: "ok", url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_stripe_error";
    return { status: "error", reason: message };
  }
}
