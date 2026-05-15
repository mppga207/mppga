export type MembershipStatus =
  | "Pending_Approval"
  | "Awaiting_Payment"
  | "Active"
  | "Grace_Period"
  | "Lapsed"
  | "Suspended"
  | "Honorary";

export type MockMember = {
  fullName: string;
  email: string;
  city: string;
  memberSinceISO: string;
  expiresAtISO: string;
  status: MembershipStatus;
  tierName: string;
  organizationName: string | null;
  directoryListed: boolean;
  ceCreditsThisYear: number;
  ceCreditsRequired: number;
  ethicsSignedAtISO: string | null;
  ethicsVersion: string;
};

export const mockMember: MockMember = {
  fullName: "Hannah Whitcomb",
  email: "hannah@coastalgroomingco.com",
  city: "Brunswick, ME",
  memberSinceISO: "2024-03-12T00:00:00-04:00",
  expiresAtISO: "2026-09-30T00:00:00-04:00",
  status: "Active",
  tierName: "Professional",
  organizationName: "Coastal Grooming Co.",
  directoryListed: true,
  ceCreditsThisYear: 6,
  ceCreditsRequired: 12,
  ethicsSignedAtISO: "2025-04-04T14:22:10-04:00",
  ethicsVersion: "v2.1",
};

export type MockRegistration = {
  id: string;
  eventTitle: string;
  eventDateISO: string;
  location: string;
  pricingTier: "member" | "guest";
  pricePaidCents: number;
  paymentStatus: "paid" | "free" | "pending" | "refunded";
  registrationStatus: "confirmed" | "waitlisted" | "cancelled";
  waitlistPosition: number | null;
};

export const mockRegistrations: readonly MockRegistration[] = [
  {
    id: "reg-001",
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
    id: "reg-002",
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
    id: "reg-003",
    eventTitle: "Spring Member Mixer",
    eventDateISO: "2026-04-05T17:00:00-04:00",
    location: "Portland, ME",
    pricingTier: "member",
    pricePaidCents: 0,
    paymentStatus: "free",
    registrationStatus: "confirmed",
    waitlistPosition: null,
  },
] as const;

export type MockCertification = {
  id: string;
  name: string;
  issuer: string;
  issuedISO: string;
  expiresISO: string | null;
};

export const mockCertifications: readonly MockCertification[] = [
  {
    id: "cert-001",
    name: "Certified Professional Groomer",
    issuer: "NDGAA",
    issuedISO: "2023-05-10T00:00:00-04:00",
    expiresISO: null,
  },
  {
    id: "cert-002",
    name: "Pet First Aid & CPR",
    issuer: "Red Cross",
    issuedISO: "2024-08-22T00:00:00-04:00",
    expiresISO: "2026-08-22T00:00:00-04:00",
  },
] as const;

export type MockInvoice = {
  id: string;
  dateISO: string;
  description: string;
  amountCents: number;
  status: "paid" | "open" | "void";
};

export const mockInvoices: readonly MockInvoice[] = [
  {
    id: "inv-2025-09",
    dateISO: "2025-09-30T00:00:00-04:00",
    description: "Professional membership · annual dues",
    amountCents: 7500,
    status: "paid",
  },
  {
    id: "inv-2024-09",
    dateISO: "2024-09-30T00:00:00-04:00",
    description: "Professional membership · annual dues",
    amountCents: 7500,
    status: "paid",
  },
];

export const ceCredits: ReadonlyArray<{
  id: string;
  source: string;
  hours: number;
  earnedISO: string;
  status: "Approved" | "Pending";
}> = [
  {
    id: "ce-001",
    source: "Safe Handling Workshop",
    hours: 4,
    earnedISO: "2025-06-14T00:00:00-04:00",
    status: "Approved",
  },
  {
    id: "ce-002",
    source: "Pet First Aid recertification",
    hours: 2,
    earnedISO: "2025-08-22T00:00:00-04:00",
    status: "Approved",
  },
  {
    id: "ce-003",
    source: "Online webinar · Coat conditioning",
    hours: 1,
    earnedISO: "2026-02-11T00:00:00-04:00",
    status: "Pending",
  },
];

export function statusLabel(status: MembershipStatus): string {
  return status.replace(/_/g, " ");
}
