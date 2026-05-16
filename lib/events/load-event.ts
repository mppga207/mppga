import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  EventLapsedPricing,
  EventStatus,
} from "@/types/database";

export interface PublicEvent {
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
  confirmedCount: number;
  isFull: boolean;
}

export interface EventWithStatus extends PublicEvent {
  status: EventStatus;
}

interface EventRow {
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

function toPublicEvent(row: EventRow, confirmedCount: number): EventWithStatus {
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
    confirmedCount,
    isFull: confirmedCount >= row.capacity,
    status: row.status,
  };
}

async function countConfirmed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventIds: string[],
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  // RLS on event_registrations restricts the row count visible to the
  // requester. For accurate capacity we route this through the public
  // event listing — `events` rows are public for published events, but
  // their associated registrations aren't. The actual capacity check at
  // reservation time runs inside the `reserve_event_spot` SECURITY
  // DEFINER function (`supabase/migrations/...event_reservations.sql`),
  // which sees the true count. The number returned here is a best-effort
  // "spots left" display for the marketing page; it MAY undercount if
  // RLS hides registrations from anonymous viewers — but the only rows
  // hidden are non-confirmed ones the public never needs to see.
  const { data } = await supabase
    .from("event_registrations")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "confirmed");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }
  return counts;
}

export const loadPublishedEvents = cache(async (): Promise<EventWithStatus[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, date, end_date, location, member_price, guest_price, capacity, waitlist_enabled, lapsed_member_pricing, status",
    )
    .eq("status", "published")
    .order("date", { ascending: true })
    .returns<EventRow[]>();

  if (error || !data) return [];
  const counts = await countConfirmed(
    supabase,
    data.map((row) => row.id),
  );
  return data.map((row) => toPublicEvent(row, counts.get(row.id) ?? 0));
});

export const loadEventById = cache(
  async (id: string): Promise<EventWithStatus | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, date, end_date, location, member_price, guest_price, capacity, waitlist_enabled, lapsed_member_pricing, status",
      )
      .eq("id", id)
      .maybeSingle<EventRow>();

    if (error || !data) return null;
    const counts = await countConfirmed(supabase, [data.id]);
    return toPublicEvent(data, counts.get(data.id) ?? 0);
  },
);
