import "server-only";

import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Tier dues edit flow per `stripe-architecture.md` §6.5.
 *
 * Stripe `Price` objects are immutable — every dues edit is "create new
 * + archive old + swap the FK on `tiers`". Existing subscribers roll
 * over at next renewal (`proration_behavior: 'none'`).
 *
 * Two entry points:
 *
 * - `updateTierDues({ tierId, newAmountCents })` — the standard admin
 *   edit. Creates a new Price under the existing Product, archives the
 *   old one, swaps the FK, migrates existing subscriptions.
 *
 * - `seedTierPrice({ tierId, amountCents })` — bootstrap path used once
 *   per tier in fresh environments. Creates the Stripe Product (if
 *   `stripe_product_id` is null) and the first Price, writes both back
 *   to `tiers`. No subscriptions exist yet so no migration step.
 *
 * Both return the count of subscriptions migrated (zero for the seed
 * path) so the admin UI can surface "47 members will pay the new amount
 * at their next renewal" in the confirmation modal.
 *
 * Service-role required: writes `tiers` and updates `memberships`-linked
 * subscriptions across RLS boundaries.
 */
export interface TierPriceUpdateResult {
  status: "ok";
  newPriceId: string;
  subscriptionsUpdated: number;
}

export type TierPriceUpdateError =
  | { status: "tier_not_found" }
  | { status: "no_change" }
  | { status: "no_existing_price" }
  | { status: "error"; reason: string };

export async function updateTierDues(args: {
  tierId: string;
  newAmountCents: number;
}): Promise<TierPriceUpdateResult | TierPriceUpdateError> {
  const supabase = createServiceRoleClient();
  const stripe = getStripe();

  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select(
      "id, name, annual_dues_cents, stripe_product_id, stripe_price_id",
    )
    .eq("id", args.tierId)
    .maybeSingle();
  if (tierError) return { status: "error", reason: tierError.message };
  if (!tier) return { status: "tier_not_found" };
  if (tier.annual_dues_cents === args.newAmountCents) {
    return { status: "no_change" };
  }
  if (!tier.stripe_product_id || !tier.stripe_price_id) {
    return { status: "no_existing_price" };
  }

  try {
    const newPrice = await stripe.prices.create({
      product: tier.stripe_product_id,
      unit_amount: args.newAmountCents,
      currency: "usd",
      recurring: { interval: "year" },
    });

    await stripe.prices.update(tier.stripe_price_id, { active: false });

    const { error: updateError } = await supabase
      .from("tiers")
      .update({
        stripe_price_id: newPrice.id,
        annual_dues_cents: args.newAmountCents,
      })
      .eq("id", tier.id);
    if (updateError) return { status: "error", reason: updateError.message };

    const { data: subscribers, error: subsError } = await supabase
      .from("memberships")
      .select("stripe_subscription_id")
      .eq("tier_id", tier.id)
      .in("status", ["Active", "Grace_Period"])
      .not("stripe_subscription_id", "is", null);
    if (subsError) return { status: "error", reason: subsError.message };

    let migrated = 0;
    for (const row of subscribers ?? []) {
      const subId = row.stripe_subscription_id;
      if (!subId) continue;
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const itemId = sub.items.data[0]?.id;
        if (!itemId) continue;
        await stripe.subscriptions.update(subId, {
          items: [{ id: itemId, price: newPrice.id }],
          proration_behavior: "none",
        });
        migrated += 1;
      } catch (err) {
        console.warn(
          "tier price migration: subscription update failed",
          subId,
          err,
        );
      }
    }

    return {
      status: "ok",
      newPriceId: newPrice.id,
      subscriptionsUpdated: migrated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_stripe_error";
    return { status: "error", reason: message };
  }
}

export async function seedTierPrice(args: {
  tierId: string;
  amountCents: number;
}): Promise<TierPriceUpdateResult | TierPriceUpdateError> {
  const supabase = createServiceRoleClient();
  const stripe = getStripe();

  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, name, stripe_product_id, stripe_price_id")
    .eq("id", args.tierId)
    .maybeSingle();
  if (tierError) return { status: "error", reason: tierError.message };
  if (!tier) return { status: "tier_not_found" };

  try {
    let productId = tier.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: `MPPGA membership — ${tier.name}`,
        metadata: { tier_id: tier.id },
      });
      productId = product.id;
    }

    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: args.amountCents,
      currency: "usd",
      recurring: { interval: "year" },
    });

    if (tier.stripe_price_id) {
      await stripe.prices.update(tier.stripe_price_id, { active: false });
    }

    const { error: updateError } = await supabase
      .from("tiers")
      .update({
        stripe_product_id: productId,
        stripe_price_id: newPrice.id,
        annual_dues_cents: args.amountCents,
      })
      .eq("id", tier.id);
    if (updateError) return { status: "error", reason: updateError.message };

    return {
      status: "ok",
      newPriceId: newPrice.id,
      subscriptionsUpdated: 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_stripe_error";
    return { status: "error", reason: message };
  }
}
