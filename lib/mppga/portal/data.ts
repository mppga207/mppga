import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSession } from "@/lib/supabase/session";
import type {
  BillingStatus,
  EventPaymentStatus,
  EventPricingTier,
  EventRegistrationStatus,
  MembershipStatus,
} from "@/types/database";

export interface MemberOverview {
  fullName: string;
  email: string;
  phone: string | null;
  status: MembershipStatus;
  billingStatus: BillingStatus | null;
  tierName: string | null;
  tierId: string | null;
  organizationName: string | null;
  organizationId: string | null;
  expiresAt: string | null;
  memberSinceISO: string;
  stripeCustomerId: string | null;
}

export interface MemberDirectoryListing {
  id: string;
  displayName: string;
  bio: string | null;
  city: string;
  state: string;
  addressLine: string | null;
  businessPhone: string | null;
  personalMobile: string | null;
  publicEmail: string | null;
  specialties: string[];
  showBusinessPhone: boolean;
  showPersonalMobile: boolean;
  showAddress: boolean;
  showPublicEmail: boolean;
  isVisible: boolean;
}

export interface MemberRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDateISO: string;
  location: string;
  pricingTier: EventPricingTier;
  pricePaidCents: number;
  paymentStatus: EventPaymentStatus;
  registrationStatus: EventRegistrationStatus;
  waitlistPosition: number | null;
}

/**
 * Loads the member's profile + active membership + tier + organization in
 * one request, scoped by RLS. `cache()` dedupes within a single render so
 * sibling components on a page (overview cards + header) don't re-fetch.
 */
export const loadMemberOverview = cache(
  async (session: AppSession): Promise<MemberOverview> => {
    const supabase = await createClient();
    const profileId = session.user.id;

    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, organization_id, created_at",
        )
        .eq("id", profileId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select(
          "tier_id, status, billing_status, expires_at, stripe_customer_id, created_at",
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
    ]);

    const tierId = membership?.tier_id ?? null;
    const orgId = profile?.organization_id ?? null;

    const [tierResult, orgResult] = await Promise.all([
      tierId
        ? supabase
            .from("tiers")
            .select("id, name")
            .eq("id", tierId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      orgId
        ? supabase
            .from("organizations")
            .select("id, name")
            .eq("id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? session.user.email ?? "",
      phone: profile?.phone ?? null,
      status: membership?.status ?? session.membershipStatus,
      billingStatus: membership?.billing_status ?? null,
      tierName: tierResult.data?.name ?? null,
      tierId: tierResult.data?.id ?? null,
      organizationName: orgResult.data?.name ?? null,
      organizationId: orgResult.data?.id ?? null,
      expiresAt: membership?.expires_at ?? null,
      memberSinceISO: membership?.created_at ?? profile?.created_at ?? "",
      stripeCustomerId: membership?.stripe_customer_id ?? null,
    };
  },
);

export const loadDirectoryListing = cache(
  async (session: AppSession): Promise<MemberDirectoryListing | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("directory_listings")
      .select(
        "id, display_name, bio, city, state, address_line, business_phone, personal_mobile, public_email, specialties, show_business_phone, show_personal_mobile, show_address, show_public_email, is_visible",
      )
      .eq("profile_id", session.user.id)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      displayName: data.display_name,
      bio: data.bio,
      city: data.city,
      state: data.state,
      addressLine: data.address_line,
      businessPhone: data.business_phone,
      personalMobile: data.personal_mobile,
      publicEmail: data.public_email,
      specialties: data.specialties ?? [],
      showBusinessPhone: data.show_business_phone,
      showPersonalMobile: data.show_personal_mobile,
      showAddress: data.show_address,
      showPublicEmail: data.show_public_email,
      isVisible: data.is_visible,
    };
  },
);

interface EventRegistrationRow {
  id: string;
  event_id: string;
  price_paid: number;
  pricing_tier: EventPricingTier;
  payment_status: EventPaymentStatus;
  status: EventRegistrationStatus;
  waitlist_position: number | null;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
}

export const loadMemberRegistrations = cache(
  async (session: AppSession): Promise<MemberRegistration[]> => {
    const supabase = await createClient();
    const { data: regs } = await supabase
      .from("event_registrations")
      .select(
        "id, event_id, price_paid, pricing_tier, payment_status, status, waitlist_position",
      )
      .eq("profile_id", session.user.id)
      .neq("status", "cancelled")
      .order("registered_at", { ascending: false })
      .returns<EventRegistrationRow[]>();

    if (!regs || regs.length === 0) return [];

    const eventIds = Array.from(new Set(regs.map((r) => r.event_id)));
    const { data: events } = await supabase
      .from("events")
      .select("id, title, date, location")
      .in("id", eventIds)
      .returns<EventRow[]>();

    const eventById = new Map<string, EventRow>(
      (events ?? []).map((event) => [event.id, event]),
    );

    return regs.flatMap((reg): MemberRegistration[] => {
      const event = eventById.get(reg.event_id);
      if (!event) return [];
      return [
        {
          id: reg.id,
          eventId: reg.event_id,
          eventTitle: event.title,
          eventDateISO: event.date,
          location: event.location,
          pricingTier: reg.pricing_tier,
          pricePaidCents: reg.price_paid,
          paymentStatus: reg.payment_status,
          registrationStatus: reg.status,
          waitlistPosition: reg.waitlist_position,
        },
      ];
    });
  },
);
