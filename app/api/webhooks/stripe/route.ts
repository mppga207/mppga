import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { sendTransactional } from "@/lib/email/send";
import { invokeMembershipStatusSync } from "@/lib/membership/sync";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { BillingStatus } from "@/types/database";

/**
 * Single shared Stripe webhook endpoint per `stripe-architecture.md`.
 *
 * - Signature verification first (raw bytes, never `.json()` before
 *   verifying — CLAUDE.md constraint #8).
 * - Service-role Supabase client only after the signature passes
 *   (`stripe-architecture.md` §2.4). The signature is the gate.
 * - Idempotent: rows update on natural keys
 *   (`stripe_subscription_id`, `stripe_customer_id`,
 *   `stripe_checkout_session_id`). Redelivery is a no-op.
 * - Status writes go through `invokeMembershipStatusSync`, not direct
 *   `memberships.status` updates (CLAUDE.md constraint #2).
 * - Email sends go through `sendTransactional`, which dedups via
 *   `email_send_log` before firing (email-automation.md §4).
 * - Unknown event types are acknowledged with 200 — never 4xx
 *   (CLAUDE.md webhook spec; Stripe will hammer the endpoint otherwise).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_BILLING_STATUSES: ReadonlySet<BillingStatus> = new Set([
  "current",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "trialing",
]);

function asBillingStatus(value: string | null | undefined): BillingStatus | null {
  if (!value) return null;
  return VALID_BILLING_STATUSES.has(value as BillingStatus)
    ? (value as BillingStatus)
    : null;
}

function periodEndIso(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      env.stripe.webhookSecret,
    );
  } catch {
    // Never log the raw payload — it can contain customer email addresses.
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("stripe webhook handler error", event.type, err);
    // Return 500 so Stripe retries; the handler must still be idempotent.
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      return;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      return;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object as Stripe.Invoice);
      return;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
      return;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
      return;
    default:
      // Unknown event types acknowledged, never 4xx'd
      // (stripe-architecture.md §3, "every other event type is logged").
      console.info("stripe webhook: unhandled event", event.type);
      return;
  }
}

/**
 * `checkout.session.completed` fires for both flows. Route by metadata:
 *   - `flow = 'billing'`: subscription-mode session — seed customer +
 *     subscription IDs on the membership so `invoice.paid` (which
 *     usually follows immediately) has the IDs to look up.
 *   - `flow = 'tickets'`: one-off payment for an event ticket — Track 7
 *     will land the registration update. Acknowledged for now.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const flow = session.metadata?.flow ?? null;
  if (flow === "tickets") {
    console.info(
      "stripe webhook: ticket checkout completed, Track 7 will handle",
      session.id,
    );
    return;
  }

  // Default to the billing flow — every subscription session created
  // by `lib/stripe/subscription-checkout.ts` tags itself flow=billing.
  if (session.mode !== "subscription") return;

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id ?? null;
  const profileId = session.metadata?.profile_id ?? session.client_reference_id;

  if (!profileId || !customerId) {
    console.warn(
      "stripe webhook: checkout.session.completed missing profile_id or customer",
      session.id,
    );
    return;
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("memberships")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(`memberships update failed: ${error.message}`);
  }
}

/**
 * `invoice.paid` is the promotion event. Subscription renewal also fires
 * this — `expires_at` gets bumped to the new period end, billing_status
 * resets to `current`, and the sync function flips status to Active if
 * the member was in Awaiting_Payment / Grace_Period / Lapsed.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason === "manual") return;

  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = createServiceRoleClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("id, profile_id, tier_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw new Error(`memberships lookup failed: ${error.message}`);
  if (!membership) {
    console.warn(
      "stripe webhook: invoice.paid for unknown subscription",
      subscriptionId,
    );
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  const periodEnd = periodEndIso(item?.current_period_end ?? null);

  const { error: updateError } = await supabase
    .from("memberships")
    .update({
      billing_status: "current",
      expires_at: periodEnd,
    })
    .eq("id", membership.id);
  if (updateError) {
    throw new Error(`memberships update failed: ${updateError.message}`);
  }

  // The sync function decides Active vs Grace vs anything else from
  // expires_at; never write status directly from here.
  await invokeMembershipStatusSync({
    mode: "single",
    profileId: membership.profile_id,
    requestedStatus: "Active",
    reason: "invoice.paid",
  });

  // Welcome fires once per membership (dedup key uses profile_id, so
  // any subsequent invoice.paid is skipped). Renewals get a separate
  // template keyed on the invoice id so each renewal fires its own
  // receipt (stripe-architecture.md §6.2, decision #4 in
  // phase-1-buildout.md §3).
  const [profile, tier] = await Promise.all([
    lookupProfile(membership.profile_id),
    lookupTier(membership.tier_id),
  ]);
  const recipient = profile?.email ?? "";
  const fullName = profile?.full_name ?? "there";
  const tierName = tier?.name ?? "MPPGA";
  const amountPaid = formatAmount(invoice.amount_paid, invoice.currency);
  const expiresFormatted = formatDate(periodEnd);

  const welcomeResult = await sendTransactional({
    template: "welcome",
    to: recipient,
    triggerType: "webhook",
    profileId: membership.profile_id,
    referenceId: membership.profile_id,
    vars: {
      full_name: fullName,
      tier_name: tierName,
      amount_paid: amountPaid,
    },
  });

  // Renewals (the welcome was skipped as a duplicate) get the
  // renewal-receipt template instead, deduped on the invoice id so
  // a webhook redelivery doesn't double-send.
  if (welcomeResult.status === "skipped_duplicate") {
    await sendTransactional({
      template: "renewal-receipt",
      to: recipient,
      triggerType: "webhook",
      profileId: membership.profile_id,
      referenceId: invoice.id ?? null,
      vars: {
        full_name: fullName,
        tier_name: tierName,
        amount_paid: amountPaid,
        expires_at: expiresFormatted,
      },
    });
  }
}

/**
 * `invoice.payment_failed` flips `billing_status` to `past_due` and fires
 * the dunning email. The time-based Grace_Period / Lapsed transitions
 * still come from the sync function, not from here — this just records
 * the billing state and starts the email cadence.
 */
async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  const supabase = createServiceRoleClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, profile_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (!membership) return;

  await supabase
    .from("memberships")
    .update({ billing_status: "past_due" })
    .eq("id", membership.id);

  const profile = await lookupProfile(membership.profile_id);
  const portalUrl = `${env.siteUrl}/dashboard/billing`;

  await sendTransactional({
    template: "dunning",
    to: profile?.email ?? "",
    triggerType: "webhook",
    profileId: membership.profile_id,
    // Dedup key includes the invoice ID so each retry sends a fresh email
    // for that specific failure attempt (`email-automation.md` §3.3).
    referenceId: invoice.id ?? null,
    vars: {
      full_name: profile?.full_name ?? "there",
      customer_portal_url: portalUrl,
      amount_due: formatAmount(invoice.amount_due, invoice.currency),
    },
  });
}

/**
 * `customer.subscription.updated` mirrors Stripe's `status` into
 * `billing_status` and, if the priced item changed tier, swaps
 * `memberships.tier_id` via a lookup against `tiers.stripe_price_id`.
 * Membership `status` (Active / Lapsed / etc.) is unchanged — Stripe's
 * subscription status is not the same as MPPGA's member status.
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, tier_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (!membership) return;

  const billingStatus = asBillingStatus(subscription.status);
  const update: { billing_status?: BillingStatus; tier_id?: string } = {};
  if (billingStatus) update.billing_status = billingStatus;

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const { data: tier } = await supabase
      .from("tiers")
      .select("id")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (tier && tier.id !== membership.tier_id) {
      update.tier_id = tier.id;
    }
  }

  if (Object.keys(update).length === 0) return;

  await supabase
    .from("memberships")
    .update(update)
    .eq("id", membership.id);
}

/**
 * `customer.subscription.deleted` sets `billing_status = 'canceled'` and
 * lets the sync function decide whether the member is now Active (still
 * within their paid period), Grace_Period (just past), or Lapsed
 * (past + 30 days). Per `stripe-architecture.md` §6.4 we never delete
 * the membership row — cancellation is a status, not a destruction.
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, profile_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (!membership) return;

  await supabase
    .from("memberships")
    .update({ billing_status: "canceled" })
    .eq("id", membership.id);

  await invokeMembershipStatusSync({
    mode: "single",
    profileId: membership.profile_id,
    reason: "subscription.deleted",
  });
}

function readSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Stripe's Invoice type carries `subscription` directly on older API
  // versions and inside `parent.subscription_details` on Dahlia.
  type InvoiceWithSubscription = Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: { subscription?: string | null } | null;
    } | null;
  };
  const inv = invoice as InvoiceWithSubscription;
  const direct = inv.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;
  const fromParent = inv.parent?.subscription_details?.subscription ?? null;
  if (typeof fromParent === "string") return fromParent;
  return null;
}

async function lookupProfile(
  profileId: string,
): Promise<{ email: string; full_name: string } | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  return data ?? null;
}

async function lookupTier(
  tierId: string,
): Promise<{ name: string } | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("tiers")
    .select("name")
    .eq("id", tierId)
    .maybeSingle();
  return data ?? null;
}

function formatAmount(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (cents === null || cents === undefined) return "";
  const code = (currency ?? "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
