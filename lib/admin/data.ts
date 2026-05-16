import { cache } from "react";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type {
  EventLapsedPricing,
  EventPaymentStatus,
  EventPricingTier,
  EventRegistrationStatus,
  EventStatus,
  MembershipStatus,
  ProfileRole,
} from "@/types/database";

export interface MembersTableFilters {
  search?: string;
  statuses?: MembershipStatus[];
  tierIds?: string[];
}

export interface MemberRow {
  profileId: string;
  fullName: string;
  email: string;
  role: ProfileRole;
  organizationName: string | null;
  membershipStatus: MembershipStatus | null;
  tierName: string | null;
  tierId: string | null;
  expiresAt: string | null;
  stripeCustomerId: string | null;
}

interface ProfileQueryRow {
  id: string;
  full_name: string | null;
  email: string;
  role: ProfileRole;
  organizations: { name: string } | null;
  memberships:
    | {
        status: MembershipStatus;
        tier_id: string | null;
        expires_at: string | null;
        stripe_customer_id: string | null;
        tiers: { name: string } | null;
      }
    | null;
}

export async function loadMembersTable(
  filters: MembersTableFilters = {},
): Promise<MemberRow[]> {
  // Admin reads are RLS-permitted on profiles + memberships + tiers +
  // organizations (data-model.md §5.1, §5.2, §5.3, §5.4). The user-scoped
  // client carries the admin JWT claim and is allowed across the table.
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, organizations(name), memberships(status, tier_id, expires_at, stripe_customer_id, tiers(name))",
    )
    .order("full_name", { ascending: true });

  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, "\\$&")}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query.returns<ProfileQueryRow[]>();
  if (error || !data) return [];

  let rows: MemberRow[] = data.map((row) => ({
    profileId: row.id,
    fullName: row.full_name ?? row.email,
    email: row.email,
    role: row.role,
    organizationName: row.organizations?.name ?? null,
    membershipStatus: row.memberships?.status ?? null,
    tierName: row.memberships?.tiers?.name ?? null,
    tierId: row.memberships?.tier_id ?? null,
    expiresAt: row.memberships?.expires_at ?? null,
    stripeCustomerId: row.memberships?.stripe_customer_id ?? null,
  }));

  if (filters.statuses && filters.statuses.length > 0) {
    const set = new Set(filters.statuses);
    rows = rows.filter((r) => r.membershipStatus && set.has(r.membershipStatus));
  }
  if (filters.tierIds && filters.tierIds.length > 0) {
    const set = new Set(filters.tierIds);
    rows = rows.filter((r) => r.tierId && set.has(r.tierId));
  }

  return rows.sort((a, b) => {
    // Default sort per admin-portal.md §4: soon-to-expire surfaces first.
    const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
    const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
    if (aExp !== bExp) return aExp - bExp;
    return a.fullName.localeCompare(b.fullName);
  });
}

export interface MemberDetail extends MemberRow {
  phone: string | null;
  membershipId: string | null;
  billingStatus: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string | null;
  registrations: AdminRegistrationRow[];
  auditEntries: AdminAuditEntry[];
}

export interface AdminRegistrationRow {
  id: string;
  eventTitle: string;
  eventDate: string;
  pricingTier: EventPricingTier;
  paymentStatus: EventPaymentStatus;
  status: EventRegistrationStatus;
  waitlistPosition: number | null;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  payload: unknown;
  createdAt: string;
}

export async function loadMemberDetail(
  profileId: string,
): Promise<MemberDetail | null> {
  const supabase = await createClient();

  interface ProfileFullRow extends ProfileQueryRow {
    phone: string | null;
    created_at: string;
  }
  interface MembershipFullRow {
    id: string;
    billing_status: string | null;
    stripe_subscription_id: string | null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, role, created_at, organizations(name), memberships(status, tier_id, expires_at, stripe_customer_id, tiers(name))",
    )
    .eq("id", profileId)
    .maybeSingle<ProfileFullRow>();
  if (!profile) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, billing_status, stripe_subscription_id")
    .eq("profile_id", profileId)
    .maybeSingle<MembershipFullRow>();

  interface RegistrationJoinRow {
    id: string;
    pricing_tier: EventPricingTier;
    payment_status: EventPaymentStatus;
    status: EventRegistrationStatus;
    waitlist_position: number | null;
    events: { title: string; date: string } | null;
  }
  const { data: regs } = await supabase
    .from("event_registrations")
    .select(
      "id, pricing_tier, payment_status, status, waitlist_position, events(title, date)",
    )
    .eq("profile_id", profileId)
    .order("registered_at", { ascending: false })
    .returns<RegistrationJoinRow[]>();

  interface AuditJoinRow {
    id: string;
    action: string;
    payload: unknown;
    created_at: string;
    profiles: { full_name: string | null; email: string } | null;
  }
  const { data: audit } = await supabase
    .from("admin_action_log")
    .select(
      "id, action, payload, created_at, profiles!admin_action_log_actor_profile_id_fkey(full_name, email)",
    )
    .eq("subject_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AuditJoinRow[]>();

  return {
    profileId: profile.id,
    fullName: profile.full_name ?? profile.email,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    organizationName: profile.organizations?.name ?? null,
    membershipStatus: profile.memberships?.status ?? null,
    tierName: profile.memberships?.tiers?.name ?? null,
    tierId: profile.memberships?.tier_id ?? null,
    expiresAt: profile.memberships?.expires_at ?? null,
    stripeCustomerId: profile.memberships?.stripe_customer_id ?? null,
    membershipId: membership?.id ?? null,
    billingStatus: membership?.billing_status ?? null,
    stripeSubscriptionId: membership?.stripe_subscription_id ?? null,
    createdAt: profile.created_at,
    registrations: (regs ?? []).map((r) => ({
      id: r.id,
      eventTitle: r.events?.title ?? "(deleted event)",
      eventDate: r.events?.date ?? "",
      pricingTier: r.pricing_tier,
      paymentStatus: r.payment_status,
      status: r.status,
      waitlistPosition: r.waitlist_position,
    })),
    auditEntries: (audit ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorName: entry.profiles?.full_name ?? entry.profiles?.email ?? null,
      payload: entry.payload,
      createdAt: entry.created_at,
    })),
  };
}

export interface AdminEventRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  location: string;
  memberPriceCents: number;
  guestPriceCents: number;
  capacity: number;
  waitlistEnabled: boolean;
  lapsedMemberPricing: EventLapsedPricing;
  status: EventStatus;
  confirmedCount: number;
  waitlistedCount: number;
}

export const loadAdminEvents = cache(async (): Promise<AdminEventRow[]> => {
  const supabase = await createClient();
  interface EventListRow {
    id: string;
    title: string;
    description: string | null;
    date: string;
    end_date: string | null;
    location: string;
    member_price: number;
    guest_price: number;
    capacity: number;
    waitlist_enabled: boolean;
    lapsed_member_pricing: EventLapsedPricing;
    status: EventStatus;
  }
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, description, date, end_date, location, member_price, guest_price, capacity, waitlist_enabled, lapsed_member_pricing, status",
    )
    .order("date", { ascending: true })
    .returns<EventListRow[]>();
  if (!events) return [];

  const ids = events.map((e) => e.id);
  const counts = new Map<string, { confirmed: number; waitlisted: number }>();
  if (ids.length > 0) {
    interface CountRow {
      event_id: string;
      status: EventRegistrationStatus;
    }
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("event_id, status")
      .in("event_id", ids)
      .neq("status", "cancelled")
      .returns<CountRow[]>();
    for (const reg of regs ?? []) {
      const bucket = counts.get(reg.event_id) ?? {
        confirmed: 0,
        waitlisted: 0,
      };
      if (reg.status === "confirmed") bucket.confirmed += 1;
      else if (reg.status === "waitlisted") bucket.waitlisted += 1;
      counts.set(reg.event_id, bucket);
    }
  }

  return events.map((row) => {
    const c = counts.get(row.id) ?? { confirmed: 0, waitlisted: 0 };
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      date: row.date,
      endDate: row.end_date,
      location: row.location,
      memberPriceCents: row.member_price,
      guestPriceCents: row.guest_price,
      capacity: row.capacity,
      waitlistEnabled: row.waitlist_enabled,
      lapsedMemberPricing: row.lapsed_member_pricing,
      status: row.status,
      confirmedCount: c.confirmed,
      waitlistedCount: c.waitlisted,
    };
  });
});

export interface AdminEventRegistrationRow {
  id: string;
  profileId: string;
  registrantName: string;
  email: string;
  pricingTier: EventPricingTier;
  paymentStatus: EventPaymentStatus;
  status: EventRegistrationStatus;
  waitlistPosition: number | null;
  pricePaid: number;
  registeredAt: string;
}

export async function loadAdminEventRegistrations(
  eventId: string,
): Promise<AdminEventRegistrationRow[]> {
  const supabase = await createClient();
  interface RegJoin {
    id: string;
    profile_id: string;
    price_paid: number;
    pricing_tier: EventPricingTier;
    payment_status: EventPaymentStatus;
    status: EventRegistrationStatus;
    waitlist_position: number | null;
    registered_at: string;
    profiles: { full_name: string | null; email: string } | null;
  }
  const { data } = await supabase
    .from("event_registrations")
    .select(
      "id, profile_id, price_paid, pricing_tier, payment_status, status, waitlist_position, registered_at, profiles(full_name, email)",
    )
    .eq("event_id", eventId)
    .order("status", { ascending: true })
    .order("waitlist_position", { ascending: true, nullsFirst: true })
    .order("registered_at", { ascending: true })
    .returns<RegJoin[]>();
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    registrantName: row.profiles?.full_name ?? row.profiles?.email ?? "—",
    email: row.profiles?.email ?? "",
    pricingTier: row.pricing_tier,
    paymentStatus: row.payment_status,
    status: row.status,
    waitlistPosition: row.waitlist_position,
    pricePaid: row.price_paid,
    registeredAt: row.registered_at,
  }));
}

export interface TierOption {
  id: string;
  name: string;
}

export async function loadTierOptions(): Promise<TierOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tiers")
    .select("id, name, display_order")
    .order("display_order", { ascending: true });
  return (data ?? []).map((t) => ({ id: t.id, name: t.name }));
}

/**
 * Service-role helper used by admin server actions that need to read a
 * member's email before sending an action notification (e.g. the
 * resend-welcome flow). Kept as a separate function so RLS-allowed reads
 * stay on the user-scoped client.
 */
export async function lookupMemberByProfileId(
  profileId: string,
): Promise<{ email: string; fullName: string | null } | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  return data
    ? { email: data.email, fullName: data.full_name ?? null }
    : null;
}
