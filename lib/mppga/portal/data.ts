import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isPreviewSession, type AppSession } from "@/lib/supabase/session";
import {
  previewDirectoryListing,
  previewMemberOverview,
  previewRegistrations,
} from "@/lib/mppga/portal/preview";
import type {
  BillingStatus,
  EventPaymentStatus,
  EventPricingTier,
  EventRegistrationStatus,
  MembershipStatus,
} from "@/types/database";

export interface MemberOverview {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  zip: string | null;
  state: string;
  status: MembershipStatus;
  billingStatus: BillingStatus | null;
  tierName: string | null;
  tierSlug: string | null;
  tierId: string | null;
  organizationName: string | null;
  organizationId: string | null;
  /** True when the signed-in profile is this org's primary contact. */
  isSalonOwner: boolean;
  ownedSalon: OwnedSalonInfo | null;
  expiresAt: string | null;
  memberSinceISO: string;
  stripeCustomerId: string | null;
}

export interface OwnedSalonInfo {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  zip: string | null;
  state: string;
  phone: string | null;
  website: string | null;
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
    if (isPreviewSession(session)) return previewMemberOverview();
    const supabase = await createClient();
    const profileId = session.user.id;

    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, last_name, email, phone, address_line, city, zip, state, organization_id, created_at",
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
            .select("id, name, slug")
            .eq("id", tierId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      orgId
        ? supabase
            .from("organizations")
            .select(
              "id, name, address_line, city, zip, state, phone, website, primary_contact_profile_id",
            )
            .eq("id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const org = orgResult.data ?? null;
    const isSalonOwner =
      org !== null && org.primary_contact_profile_id === profileId;
    const ownedSalon: OwnedSalonInfo | null = isSalonOwner && org
      ? {
          id: org.id,
          name: org.name,
          addressLine: org.address_line ?? null,
          city: org.city ?? null,
          zip: org.zip ?? null,
          state: org.state ?? "ME",
          phone: org.phone ?? null,
          website: org.website ?? null,
        }
      : null;

    const firstName = profile?.first_name ?? "";
    const lastName = profile?.last_name ?? "";
    const fullName =
      profile?.full_name && profile.full_name.trim().length > 0
        ? profile.full_name
        : `${firstName} ${lastName}`.trim();

    return {
      fullName,
      firstName,
      lastName,
      email: profile?.email ?? session.user.email ?? "",
      phone: profile?.phone ?? null,
      addressLine: profile?.address_line ?? null,
      city: profile?.city ?? null,
      zip: profile?.zip ?? null,
      state: profile?.state ?? "ME",
      status: membership?.status ?? session.membershipStatus,
      billingStatus: membership?.billing_status ?? null,
      tierName: tierResult.data?.name ?? null,
      tierSlug: tierResult.data?.slug ?? null,
      tierId: tierResult.data?.id ?? null,
      organizationName: org?.name ?? null,
      organizationId: org?.id ?? null,
      isSalonOwner,
      ownedSalon,
      expiresAt: membership?.expires_at ?? null,
      memberSinceISO: membership?.created_at ?? profile?.created_at ?? "",
      stripeCustomerId: membership?.stripe_customer_id ?? null,
    };
  },
);

export const loadDirectoryListing = cache(
  async (session: AppSession): Promise<MemberDirectoryListing | null> => {
    if (isPreviewSession(session)) return previewDirectoryListing();
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
    if (isPreviewSession(session)) return previewRegistrations();
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
