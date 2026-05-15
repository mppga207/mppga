import { NextResponse } from "next/server";

// TODO(stripe-architecture.md): implement the single shared Stripe webhook
// handler. Must verify the `stripe-signature` header before processing, be
// idempotent, and handle invoice.paid, invoice.payment_failed,
// customer.subscription.deleted, customer.subscription.updated, and
// checkout.session.completed. Subscriptions update `memberships`; one-off
// ticket checkouts update `transactions` + `event_registrations`.
export function POST(): NextResponse {
  return NextResponse.json(
    { error: "Stripe webhook handler not yet implemented." },
    { status: 501 },
  );
}
