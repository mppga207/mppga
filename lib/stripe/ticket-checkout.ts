import "server-only";

import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

/**
 * Creates a Stripe Checkout session in `mode: 'payment'` for a single
 * event ticket per `stripe-architecture.md` §8.1 and `events.md` §6.
 *
 * The session is opaque to subscriptions — `metadata.flow = 'tickets'`
 * routes the downstream `checkout.session.completed` webhook to the
 * ticket handler (which flips `event_registrations.payment_status` to
 * `paid`).
 *
 * Pricing is passed in by the caller — never resolved here. The price
 * stored on the registration is the snapshot at reservation time
 * (`lib/events/actions.ts`), not the Checkout amount, so we don't
 * round-trip a Price object through Stripe just to get a one-off
 * line item.
 */
export interface CreateTicketCheckoutInput {
  eventId: string;
  eventTitle: string;
  registrationId: string;
  profileId: string | null;
  customerEmail: string | null;
  priceCents: number;
}

export type TicketCheckoutResult =
  | { status: "ok"; url: string }
  | { status: "error"; reason: string };

export async function createTicketCheckoutSession(
  input: CreateTicketCheckoutInput,
): Promise<TicketCheckoutResult> {
  if (input.priceCents <= 0) {
    return {
      status: "error",
      reason: "ticket_checkout_requires_positive_price",
    };
  }

  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: input.priceCents,
            product_data: {
              name: input.eventTitle,
              metadata: { event_id: input.eventId },
            },
          },
        },
      ],
      success_url: `${env.siteUrl}/events/${input.eventId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/events/${input.eventId}?checkout=cancelled`,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      ...(input.profileId ? { client_reference_id: input.profileId } : {}),
      metadata: {
        flow: "tickets",
        event_id: input.eventId,
        event_registration_id: input.registrationId,
        ...(input.profileId ? { profile_id: input.profileId } : {}),
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
