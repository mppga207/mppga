import type { MemberRow, TierOption } from "@/lib/admin/data";
import type { OverviewActionables } from "@/lib/admin/overview-data";

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
const TIER_BASIC = "00000000-0000-0000-0000-000000010002";
const TIER_SALON = "00000000-0000-0000-0000-000000010003";

export const PREVIEW_TIER_OPTIONS: readonly TierOption[] = [
  { id: TIER_BASIC, name: "Basic Membership" },
  { id: TIER_PROFESSIONAL, name: "Professional" },
  { id: TIER_SALON, name: "Salon" },
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
    tierName: "Salon",
    tierId: TIER_SALON,
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
    tierName: "Basic Membership",
    tierId: TIER_BASIC,
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

const daysAgo = (days: number, hours = 0): string =>
  new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();

export const PREVIEW_OVERVIEW: OverviewActionables = {
  contactSubmissions: {
    total: 2,
    items: [
      {
        id: "00000000-0000-0000-0000-000000030001",
        name: "Dana Whitford",
        email: "dana.whitford@example.com",
        topic: "membership",
        message:
          "Hi, I just moved my mobile-grooming setup to Maine and I'm trying to figure out which tier fits a one-person van operation. Are sole-prop groomers Professional or Salon? Happy to hop on a quick call.",
        createdAt: daysAgo(0, 3),
      },
      {
        id: "00000000-0000-0000-0000-000000030002",
        name: "Sam Beaulieu",
        email: "sam@bowdoinpets.org",
        topic: "sponsorship",
        message:
          "Our shop would love to sponsor the fall workshop in Bangor. Who handles sponsorship tiers? Send a packet whenever convenient.",
        createdAt: daysAgo(2, 6),
      },
    ],
  },
  awaitingPayment: {
    total: 3,
    items: [
      {
        profileId: "00000000-0000-0000-0000-000000020007",
        fullName: "Renee Theriault",
        email: "renee@bangorgroomers.com",
        tierName: "Professional",
        joinedAt: daysAgo(1, 2),
        expiresAt: null,
      },
      {
        profileId: "00000000-0000-0000-0000-000000020009",
        fullName: "Avery Lemieux",
        email: "avery@lemieuxgrooming.com",
        tierName: "Basic Membership",
        joinedAt: daysAgo(3),
        expiresAt: null,
      },
      {
        profileId: "00000000-0000-0000-0000-000000020010",
        fullName: "Kit Soucy",
        email: "kit.soucy@example.com",
        tierName: "Professional",
        joinedAt: daysAgo(6),
        expiresAt: null,
      },
    ],
  },
  pastDue: {
    total: 1,
    items: [
      {
        profileId: "00000000-0000-0000-0000-000000020011",
        fullName: "Imogen Frechette",
        email: "imogen@coastalpaws.com",
        tierName: "Professional",
        joinedAt: daysAgo(380),
        expiresAt: daysAgo(15),
      },
    ],
  },
  recentlyJoined: {
    total: 2,
    items: [
      {
        profileId: "00000000-0000-0000-0000-000000020012",
        fullName: "Noor Abdi",
        email: "noor@scarboroughgrooming.com",
        tierName: "Professional",
        joinedAt: daysAgo(2, 5),
        expiresAt: null,
      },
      {
        profileId: "00000000-0000-0000-0000-000000020013",
        fullName: "Wyatt Pinkham",
        email: "wyatt@wagsofmaine.com",
        tierName: "Salon",
        joinedAt: daysAgo(9),
        expiresAt: null,
      },
    ],
  },
  draftEvents: {
    total: 1,
    items: [
      {
        id: "00000000-0000-0000-0000-000000040001",
        title: "Hand-stripping intensive",
        date: new Date(
          Date.now() + 21 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        location: "Augusta, ME",
      },
    ],
  },
};
