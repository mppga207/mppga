"use server";

import { redirect } from "next/navigation";

import { requireSession } from "@/lib/supabase/session";
import { createCustomerPortalSession } from "@/lib/stripe/customer-portal-session";
import { createSubscriptionCheckoutSession } from "@/lib/stripe/subscription-checkout";

/**
 * Starts the subscription Checkout flow. Server action invoked from
 * `/dashboard/checkout` and `/renew` — the only two surfaces a member
 * uses to initiate or resume a dues payment.
 */
export async function startSubscriptionCheckout(): Promise<void> {
  const session = await requireSession("/dashboard/checkout");
  const result = await createSubscriptionCheckoutSession(session.user.id);

  if (result.status === "ok") {
    redirect(result.url);
  }

  // Surface a structured failure as a query string back to the page.
  // The page reads `?error=...` and renders the right copy.
  const params = new URLSearchParams({ error: result.status });
  if (result.status === "missing_price") {
    params.set("tier_id", result.tierId);
  } else if (result.status === "error") {
    params.set("detail", result.reason);
  }
  redirect(`/dashboard/checkout?${params.toString()}`);
}

/**
 * Opens the Stripe Customer Portal for an existing subscriber. Server
 * action invoked from `/dashboard/billing` and the `/renew` page when
 * the member is in Grace_Period / Lapsed.
 */
export async function openCustomerPortal(): Promise<void> {
  const session = await requireSession("/dashboard/billing");
  const result = await createCustomerPortalSession(session.user.id);

  if (result.status === "ok") {
    redirect(result.url);
  }

  // No customer record yet (Awaiting_Payment / Honorary) — bounce them
  // back with a structured marker so the page can explain.
  const params = new URLSearchParams({ portal_error: result.status });
  if (result.status === "error") params.set("detail", result.reason);
  redirect(`/dashboard/billing?${params.toString()}`);
}
