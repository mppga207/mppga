import type { MemberRow, TierOption } from "@/lib/admin/data";

/**
 * Demo-only fixtures so the preview-cookie admin walkthrough has
 * something to look at instead of an empty Members table. The data is
 * intentionally Maine-flavoured (groomers across the state) so the
 * association sees what a populated roster will feel like.
 *
 * IDs use placeholder UUIDs that will never collide with a real
 * `auth.users.id`. The Members detail view links into
 * `/admin/members/[id]` — those routes 404 in preview mode (no
 * matching row), which is the honest demo behaviour.
 */
const TIER_PROFESSIONAL = "00000000-0000-0000-0000-000000010001";
const TIER_STUDENT = "00000000-0000-0000-0000-000000010002";
const TIER_CORPORATE = "00000000-0000-0000-0000-000000010003";

export const PREVIEW_TIER_OPTIONS: readonly TierOption[] = [
  { id: TIER_STUDENT, name: "Student / Apprentice" },
  { id: TIER_PROFESSIONAL, name: "Professional" },
  { id: TIER_CORPORATE, name: "Corporate / Salon" },
];

export const PREVIEW_MEMBER_ROWS: readonly MemberRow[] = [
  {
    profileId: "00000000-0000-0000-0000-000000020001",
    fullName: "Hannah Bellerose",
    email: "hannah@bellerosegrooming.com",
    role: "member",
    organizationName: "Bellerose Grooming Studio",
    membershipStatus: "Active",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: "2027-03-12T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020002",
    fullName: "Marcus Doyon",
    email: "marcus.doyon@gmail.com",
    role: "member",
    organizationName: null,
    membershipStatus: "Active",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: "2026-09-04T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020003",
    fullName: "Sage Lavoie",
    email: "sage@waggintailsmaine.com",
    role: "member",
    organizationName: "Waggin’ Tails of Augusta",
    membershipStatus: "Grace_Period",
    tierName: "Corporate / Salon",
    tierId: TIER_CORPORATE,
    expiresAt: "2026-05-09T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020004",
    fullName: "Brielle Ouellette",
    email: "brielle.o@maineapprentice.com",
    role: "member",
    organizationName: null,
    membershipStatus: "Active",
    tierName: "Student / Apprentice",
    tierId: TIER_STUDENT,
    expiresAt: "2026-11-21T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020005",
    fullName: "Theo Pelletier",
    email: "theo@portlandpups.com",
    role: "admin",
    organizationName: "Portland Pups",
    membershipStatus: "Active",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: "2026-08-15T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020006",
    fullName: "Marguerite Caron",
    email: "marguerite@cocoandclipper.com",
    role: "member",
    organizationName: "Coco & Clipper",
    membershipStatus: "Lapsed",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: "2026-02-28T00:00:00.000Z",
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020007",
    fullName: "Renee Theriault",
    email: "renee@bangorgroomers.com",
    role: "member",
    organizationName: "Bangor Groomers Co-op",
    membershipStatus: "Awaiting_Payment",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: null,
    stripeCustomerId: null,
  },
  {
    profileId: "00000000-0000-0000-0000-000000020008",
    fullName: "Linnea Karjala",
    email: "linnea@karjalapups.com",
    role: "member",
    organizationName: null,
    membershipStatus: "Honorary",
    tierName: "Professional",
    tierId: TIER_PROFESSIONAL,
    expiresAt: null,
    stripeCustomerId: null,
  },
];
