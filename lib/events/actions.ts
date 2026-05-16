"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTransactional } from "@/lib/email/send";
import { resolveEventPrice } from "@/lib/events/resolve-price";
import { createTicketCheckoutSession } from "@/lib/stripe/ticket-checkout";
import type {
  EventPaymentStatus,
  EventPricingTier,
  EventRegistrationStatus,
  MembershipStatus,
} from "@/types/database";

/**
 * Reserves a spot on an event for the signed-in member. Wraps the
 * `reserve_event_spot` SECURITY DEFINER function which atomically
 * checks capacity and inserts the registration row. See
 * `supabase/migrations/...event_reservations.sql`.
 *
 * Flow per `events.md` §5:
 *   - Resolve pricing server-side from the event + member status.
 *   - Call reserve_event_spot. Result is confirmed or waitlisted
 *     depending on capacity + waitlist_enabled.
 *   - Free + member-tier: skip Stripe, mark `free`, fire confirmation
 *     email, return to the confirmation page.
 *   - Paid + confirmed: create a Stripe Checkout session, redirect.
 *   - Paid + waitlisted: fire waitlist-confirmation email, return to
 *     the event detail page with a flag. Checkout link is sent later
 *     by the waitlist-promotion flow.
 */
export type ReserveSpotResult =
  | { status: "ok"; redirectTo: string }
  | { status: "must_sign_in" }
  | { status: "already_registered" }
  | { status: "event_full" }
  | { status: "missing_event" }
  | { status: "error"; reason: string };

interface MemberContext {
  profileId: string;
  email: string | null;
  fullName: string | null;
  membershipStatus: MembershipStatus | null;
}

async function loadMemberContext(
  supabase: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
): Promise<MemberContext> {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("status")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);
  return {
    profileId,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? null,
    membershipStatus: membership?.status ?? null,
  };
}

interface ReserveOptions {
  eventId: string;
}

export async function reserveSpot(
  options: ReserveOptions,
): Promise<ReserveSpotResult> {
  const session = await getSession();
  if (!session) {
    return { status: "must_sign_in" };
  }

  const supabase = createServiceRoleClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, date, location, member_price, guest_price, status, lapsed_member_pricing",
    )
    .eq("id", options.eventId)
    .maybeSingle();
  if (eventError) {
    return { status: "error", reason: eventError.message };
  }
  if (!event || event.status !== "published") {
    return { status: "missing_event" };
  }

  const member = await loadMemberContext(supabase, session.user.id);
  const price = resolveEventPrice({
    memberPriceCents: event.member_price,
    guestPriceCents: event.guest_price,
    lapsedMemberPricing: event.lapsed_member_pricing,
    membershipStatus: member.membershipStatus,
  });

  const isFreeForMember = price.cents === 0 && price.tier === "member";
  const initialPaymentStatus: EventPaymentStatus = isFreeForMember
    ? "free"
    : "pending";

  const { data: registration, error: rpcError } = await supabase.rpc(
    "reserve_event_spot",
    {
      p_event_id: event.id,
      p_profile_id: session.user.id,
      p_pricing_tier: price.tier,
      p_price_cents: price.cents,
      p_payment_status: initialPaymentStatus,
    },
  );

  if (rpcError) {
    const code = rpcError.code ?? "";
    if (code === "23505") return { status: "already_registered" };
    if (code === "23514") {
      // CHECK violation includes our "event is full" raise.
      if (/full/i.test(rpcError.message)) return { status: "event_full" };
      return { status: "error", reason: rpcError.message };
    }
    if (code === "P0002" || /not found/i.test(rpcError.message)) {
      return { status: "missing_event" };
    }
    return { status: "error", reason: rpcError.message };
  }
  if (!registration) {
    return { status: "error", reason: "reservation_returned_null" };
  }

  const regStatus: EventRegistrationStatus = registration.status;
  const isConfirmed = regStatus === "confirmed";

  // Waitlist branch: fire the waitlist confirmation, send the member
  // back to the event detail page.
  if (regStatus === "waitlisted") {
    await fireWaitlistConfirmation({
      event,
      registrationId: registration.id,
      member,
      position: registration.waitlist_position,
    });
    return {
      status: "ok",
      redirectTo: `/events/${event.id}?registration=waitlisted`,
    };
  }

  // Confirmed + free → no Stripe, fire confirmation, send to /confirmation.
  if (isConfirmed && isFreeForMember) {
    await fireEventConfirmation({
      event,
      registrationId: registration.id,
      member,
      pricingTier: price.tier,
      priceCents: 0,
    });
    return {
      status: "ok",
      redirectTo: `/events/${event.id}/confirmation`,
    };
  }

  // Confirmed + paid → Stripe Checkout.
  const checkout = await createTicketCheckoutSession({
    eventId: event.id,
    eventTitle: event.title,
    registrationId: registration.id,
    profileId: session.user.id,
    customerEmail: member.email,
    priceCents: price.cents,
  });
  if (checkout.status !== "ok") {
    return { status: "error", reason: checkout.reason };
  }
  return { status: "ok", redirectTo: checkout.url };
}

/**
 * Server-action wrapper invoked from the event detail page's reserve
 * form. Performs the reservation, then redirects to the resulting
 * URL. Errors are surfaced via a structured query string on the event
 * page so the form can re-render with the right copy.
 */
export async function reserveSpotAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    redirect("/events?error=missing_event");
  }
  const result = await reserveSpot({ eventId });
  if (result.status === "ok") {
    redirect(result.redirectTo);
  }
  if (result.status === "must_sign_in") {
    redirect(
      `/sign-in?next=${encodeURIComponent(`/events/${eventId}`)}`,
    );
  }
  const params = new URLSearchParams({ registration: result.status });
  if (result.status === "error") params.set("detail", result.reason);
  redirect(`/events/${eventId}?${params.toString()}`);
}

interface FireConfirmationInput {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
  registrationId: string;
  member: MemberContext;
  pricingTier: EventPricingTier;
  priceCents: number;
}

async function fireEventConfirmation(input: FireConfirmationInput): Promise<void> {
  if (!input.member.email) return;
  await sendTransactional({
    template: "event-confirmation",
    to: input.member.email,
    triggerType: "automated",
    profileId: input.member.profileId,
    referenceId: input.registrationId,
    vars: {
      full_name: input.member.fullName ?? input.member.email,
      event_title: input.event.title,
      event_date: input.event.date,
      event_location: input.event.location,
      amount_paid:
        input.priceCents === 0
          ? "Free"
          : `$${(input.priceCents / 100).toFixed(2)}`,
    },
  });
}

interface FireWaitlistInput {
  event: { id: string; title: string };
  registrationId: string;
  member: MemberContext;
  position: number | null;
}

async function fireWaitlistConfirmation(
  input: FireWaitlistInput,
): Promise<void> {
  if (!input.member.email) return;
  await sendTransactional({
    template: "waitlist-confirmation",
    to: input.member.email,
    triggerType: "automated",
    profileId: input.member.profileId,
    referenceId: input.registrationId,
    vars: {
      full_name: input.member.fullName ?? input.member.email,
      event_title: input.event.title,
      waitlist_position: input.position ?? 0,
    },
  });
}

/**
 * Cancels a member's own registration, then promotes the next
 * waitlisted member if one is waiting.
 *
 * Members can cancel their own confirmed or waitlisted registrations.
 * Admin cancellations go through a separate admin server action
 * (Track 6 — admin portal data wiring).
 */
export type CancelRegistrationResult =
  | { status: "ok" }
  | { status: "must_sign_in" }
  | { status: "missing_registration" }
  | { status: "error"; reason: string };

export async function cancelMyRegistration(
  registrationId: string,
): Promise<CancelRegistrationResult> {
  const session = await getSession();
  if (!session) return { status: "must_sign_in" };

  const supabase = createServiceRoleClient();
  const { data: existing, error: loadError } = await supabase
    .from("event_registrations")
    .select("id, event_id, profile_id, status")
    .eq("id", registrationId)
    .maybeSingle();
  if (loadError) return { status: "error", reason: loadError.message };
  if (!existing || existing.profile_id !== session.user.id) {
    return { status: "missing_registration" };
  }
  if (existing.status === "cancelled") return { status: "ok" };

  const wasConfirmed = existing.status === "confirmed";

  const { error: updateError } = await supabase
    .from("event_registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId);
  if (updateError) return { status: "error", reason: updateError.message };

  if (wasConfirmed) {
    await promoteWaitlist(existing.event_id);
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/events/${existing.event_id}`);
  return { status: "ok" };
}

/**
 * Promotes the lowest-numbered waitlisted registration on an event,
 * if capacity is now available. Fires the appropriate post-promotion
 * email (payment-required for paid events, confirmation for free).
 *
 * Invoked from cancellation flows (above) and from the nightly stale-
 * pending-cleanup cron. Idempotent: returns no-op when there's nothing
 * to promote.
 */
export async function promoteWaitlist(eventId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: promoted, error: rpcError } = await supabase.rpc(
    "promote_next_waitlisted",
    { p_event_id: eventId },
  );
  if (rpcError) {
    console.error("promote_next_waitlisted failed", eventId, rpcError);
    return;
  }
  if (!promoted) return;

  const { data: event } = await supabase
    .from("events")
    .select("id, title, date, location")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return;

  const member = await loadMemberContext(supabase, promoted.profile_id);
  if (!member.email) return;

  if (promoted.payment_status === "free") {
    await fireEventConfirmation({
      event,
      registrationId: promoted.id,
      member,
      pricingTier: promoted.pricing_tier,
      priceCents: 0,
    });
    return;
  }

  // Paid: build a fresh Checkout link and send the
  // `waitlist-promoted-payment` template.
  const checkout = await createTicketCheckoutSession({
    eventId: event.id,
    eventTitle: event.title,
    registrationId: promoted.id,
    profileId: promoted.profile_id,
    customerEmail: member.email,
    priceCents: promoted.price_paid,
  });

  if (checkout.status !== "ok") {
    console.error("ticket_checkout_failed_on_waitlist_promotion", checkout);
    return;
  }

  const { data: settings } = await supabase
    .from("email_settings")
    .select("waitlist_payment_link_expiry_hours")
    .limit(1)
    .maybeSingle();

  await sendTransactional({
    template: "waitlist-promoted-payment",
    to: member.email,
    triggerType: "automated",
    profileId: member.profileId,
    // Distinct reference id so re-promotion (e.g. after a previous
    // pending registration expires) doesn't collide with the original
    // waitlist confirmation send.
    referenceId: `${promoted.id}:promoted`,
    vars: {
      full_name: member.fullName ?? member.email,
      event_title: event.title,
      event_date: event.date,
      checkout_url: checkout.url,
      payment_link_expiry_hours:
        settings?.waitlist_payment_link_expiry_hours ?? 24,
    },
  });
}
