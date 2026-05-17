import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface LandingStats {
  memberCount: number;
  townCount: number;
  eventCountThisYear: number;
}

export async function loadLandingStats(): Promise<LandingStats | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_landing_stats");

  if (error || !data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const member = Number(raw.member_count);
  const town = Number(raw.town_count);
  const events = Number(raw.event_count_this_year);

  if (
    !Number.isFinite(member) ||
    !Number.isFinite(town) ||
    !Number.isFinite(events)
  ) {
    return null;
  }

  return {
    memberCount: member,
    townCount: town,
    eventCountThisYear: events,
  };
}
