import { cache } from "react";

import { PREVIEW_OVERVIEW } from "@/lib/admin/preview";
import { createClient } from "@/lib/supabase/server";
import { readPreviewMode } from "@/lib/supabase/session";
import type { ContactTopic } from "@/types/database";

const SECTION_LIMIT = 5;
const RECENTLY_JOINED_WINDOW_DAYS = 14;

export interface ContactSubmissionItem {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  createdAt: string;
}

export interface MemberHighlightItem {
  profileId: string;
  fullName: string;
  email: string;
  tierName: string | null;
  /** memberships.created_at — when the membership row was created */
  joinedAt: string | null;
  /** memberships.expires_at — relevant for past-due / lapsed members */
  expiresAt: string | null;
}

export interface DraftEventItem {
  id: string;
  title: string;
  date: string;
  location: string;
}

export interface OverviewSection<T> {
  items: T[];
  total: number;
}

export interface OverviewActionables {
  contactSubmissions: OverviewSection<ContactSubmissionItem>;
  awaitingPayment: OverviewSection<MemberHighlightItem>;
  pastDue: OverviewSection<MemberHighlightItem>;
  recentlyJoined: OverviewSection<MemberHighlightItem>;
  draftEvents: OverviewSection<DraftEventItem>;
}

interface MembershipQueryRow {
  profile_id: string;
  created_at: string;
  expires_at: string | null;
  profiles: { full_name: string | null; email: string } | null;
  tiers: { name: string } | null;
}

function mapMembership(row: MembershipQueryRow): MemberHighlightItem {
  return {
    profileId: row.profile_id,
    fullName: row.profiles?.full_name?.trim() || row.profiles?.email || "—",
    email: row.profiles?.email ?? "",
    tierName: row.tiers?.name ?? null,
    joinedAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export const loadAdminOverview = cache(
  async (): Promise<OverviewActionables> => {
    if (await readPreviewMode()) {
      return PREVIEW_OVERVIEW;
    }
    const supabase = await createClient();

    // contact_submissions: admin SELECT per RLS in
    // 20260517000003_contact_submissions.sql. Unread + un-archived only.
    const contactRes = await supabase
      .from("contact_submissions")
      .select("id, name, email, topic, message, created_at", {
        count: "exact",
      })
      .is("read_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(SECTION_LIMIT);

    const memberSelect =
      "profile_id, created_at, expires_at, profiles!inner(full_name, email), tiers(name)";

    const awaitingRes = await supabase
      .from("memberships")
      .select(memberSelect, { count: "exact" })
      .eq("status", "Awaiting_Payment")
      .order("created_at", { ascending: false })
      .limit(SECTION_LIMIT)
      .returns<MembershipQueryRow[]>();

    const pastDueRes = await supabase
      .from("memberships")
      .select(memberSelect, { count: "exact" })
      .eq("billing_status", "past_due")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .limit(SECTION_LIMIT)
      .returns<MembershipQueryRow[]>();

    const recentCutoff = new Date(
      Date.now() - RECENTLY_JOINED_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentlyJoinedRes = await supabase
      .from("memberships")
      .select(memberSelect, { count: "exact" })
      .in("status", ["Active", "Honorary"])
      .gte("created_at", recentCutoff)
      .order("created_at", { ascending: false })
      .limit(SECTION_LIMIT)
      .returns<MembershipQueryRow[]>();

    const draftRes = await supabase
      .from("events")
      .select("id, title, date, location", { count: "exact" })
      .eq("status", "draft")
      .order("date", { ascending: true })
      .limit(SECTION_LIMIT);

    return {
      contactSubmissions: {
        items: (contactRes.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          topic: row.topic as ContactTopic,
          message: row.message,
          createdAt: row.created_at,
        })),
        total: contactRes.count ?? 0,
      },
      awaitingPayment: {
        items: (awaitingRes.data ?? []).map(mapMembership),
        total: awaitingRes.count ?? 0,
      },
      pastDue: {
        items: (pastDueRes.data ?? []).map(mapMembership),
        total: pastDueRes.count ?? 0,
      },
      recentlyJoined: {
        items: (recentlyJoinedRes.data ?? []).map(mapMembership),
        total: recentlyJoinedRes.count ?? 0,
      },
      draftEvents: {
        items: (draftRes.data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          date: row.date,
          location: row.location,
        })),
        total: draftRes.count ?? 0,
      },
    };
  },
);
