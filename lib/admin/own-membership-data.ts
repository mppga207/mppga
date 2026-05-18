import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface OwnMembershipTierOption {
  slug: "basic" | "professional" | "salon";
  name: string;
}

export const loadAdminHasOwnMembership = cache(
  async (profileId: string): Promise<boolean> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("memberships")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();
    return data !== null;
  },
);

interface TierRow {
  slug: string;
  name: string;
  display_order: number;
}

export const loadAdminTierOptions = cache(
  async (): Promise<OwnMembershipTierOption[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tiers")
      .select("slug, name, display_order")
      .order("display_order", { ascending: true })
      .returns<TierRow[]>();
    if (!data) return [];
    const result: OwnMembershipTierOption[] = [];
    for (const row of data) {
      if (
        row.slug === "basic" ||
        row.slug === "professional" ||
        row.slug === "salon"
      ) {
        result.push({ slug: row.slug, name: row.name });
      }
    }
    return result;
  },
);
