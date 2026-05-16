import type {
  MemberDirectoryListing,
  MemberOverview,
  MemberRegistration,
} from "@/lib/mppga/portal/data";

/**
 * Placeholder data returned by the portal loaders when Supabase isn't
 * configured (preview mode). Keeps the temporary `/sign-in` "preview
 * dashboard" buttons demoable before the backend is provisioned.
 *
 * Once the live Supabase project + env vars land, `isPreviewSession`
 * returns false and these are never read.
 */

export function previewMemberOverview(): MemberOverview {
  return {
    fullName: "Hannah Whitcomb",
    email: "hannah@coastalgroomingco.example",
    phone: "+1 207 555 0142",
    status: "Active",
    billingStatus: "current",
    tierName: "Professional",
    tierId: null,
    organizationName: "Coastal Grooming Co.",
    organizationId: null,
    expiresAt: "2026-09-30T00:00:00-04:00",
    memberSinceISO: "2024-03-12T00:00:00-04:00",
    stripeCustomerId: null,
  };
}

export function previewDirectoryListing(): MemberDirectoryListing {
  return {
    id: "preview-listing",
    displayName: "Coastal Grooming Co.",
    bio: "Brunswick-based grooming shop specializing in hand-scissoring and senior-pet handling.",
    city: "Brunswick",
    state: "ME",
    addressLine: null,
    businessPhone: "+1 207 555 0142",
    personalMobile: null,
    publicEmail: "hello@coastalgroomingco.example",
    specialties: ["Hand-scissoring", "Senior pets", "Doodle coats"],
    showBusinessPhone: true,
    showPersonalMobile: false,
    showAddress: false,
    showPublicEmail: true,
    isVisible: true,
  };
}

export function previewRegistrations(): MemberRegistration[] {
  return [
    {
      id: "preview-reg-001",
      eventId: "preview-evt-001",
      eventTitle: "Safe Handling Workshop",
      eventDateISO: "2026-06-14T13:00:00-04:00",
      location: "Portland, ME",
      pricingTier: "member",
      pricePaidCents: 2000,
      paymentStatus: "paid",
      registrationStatus: "confirmed",
      waitlistPosition: null,
    },
    {
      id: "preview-reg-002",
      eventId: "preview-evt-002",
      eventTitle: "Hand-Scissoring Clinic",
      eventDateISO: "2026-07-09T10:00:00-04:00",
      location: "Bangor, ME",
      pricingTier: "member",
      pricePaidCents: 0,
      paymentStatus: "pending",
      registrationStatus: "waitlisted",
      waitlistPosition: 3,
    },
    {
      id: "preview-reg-003",
      eventId: "preview-evt-003",
      eventTitle: "Spring Member Mixer",
      eventDateISO: "2026-04-05T17:00:00-04:00",
      location: "Portland, ME",
      pricingTier: "member",
      pricePaidCents: 0,
      paymentStatus: "free",
      registrationStatus: "confirmed",
      waitlistPosition: null,
    },
  ];
}

export interface PreviewCheckoutTier {
  name: string;
  description: string;
  annual_dues_cents: number;
  stripe_price_id: string | null;
}

export function previewCheckoutTier(): PreviewCheckoutTier {
  return {
    name: "Professional",
    description: "Full voting rights, directory listing, member event pricing.",
    annual_dues_cents: 7500,
    stripe_price_id: null,
  };
}
