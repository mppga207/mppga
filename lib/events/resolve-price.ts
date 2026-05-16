import "server-only";

import type {
  EventLapsedPricing,
  EventPricingTier,
  MembershipStatus,
} from "@/types/database";

/**
 * Pricing matrix per `events.md` §4. Resolved server-side, never on the
 * client. The result is snapshotted into `event_registrations.price_paid`
 * and `event_registrations.pricing_tier` at the moment of reservation
 * (see `lib/events/actions.ts`) so future tier-price changes don't
 * retroactively alter a member's receipt.
 *
 * - Active / Honorary  → member price, tier=member
 * - Grace_Period / Lapsed → event.lapsed_member_pricing decides
 * - Awaiting_Payment / Suspended / anonymous → guest price, tier=guest
 *
 * `member_price = 0` + `tier = member` is the "free for members" case,
 * caller routes around Stripe.
 */
export interface ResolvePriceInput {
  memberPriceCents: number;
  guestPriceCents: number;
  lapsedMemberPricing: EventLapsedPricing;
  membershipStatus: MembershipStatus | null;
}

export interface ResolvedPrice {
  tier: EventPricingTier;
  cents: number;
}

export function resolveEventPrice(input: ResolvePriceInput): ResolvedPrice {
  const { memberPriceCents, guestPriceCents, lapsedMemberPricing } = input;
  const status = input.membershipStatus;

  if (status === "Active" || status === "Honorary") {
    return { tier: "member", cents: memberPriceCents };
  }

  if (status === "Grace_Period" || status === "Lapsed") {
    return lapsedMemberPricing === "member"
      ? { tier: "member", cents: memberPriceCents }
      : { tier: "guest", cents: guestPriceCents };
  }

  // Awaiting_Payment, Suspended, anonymous — all pay guest.
  return { tier: "guest", cents: guestPriceCents };
}
