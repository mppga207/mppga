import { createClient } from "@/lib/supabase/server";

export interface AdminTier {
  id: string;
  name: string;
  slug: string;
  description: string;
  annualDuesCents: number;
  directoryListing: boolean;
  umbrellaAccount: boolean;
  umbrellaEmployeeLimit: number | null;
  perks: string[];
  displayOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  // Members on this tier in a state that bills (used for the dues-change
  // confirmation prompt per stripe-architecture.md §6.5).
  activeSubscriberCount: number;
  updatedAt: string;
}

interface TierRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  annual_dues_cents: number;
  directory_listing: boolean;
  umbrella_account: boolean;
  umbrella_employee_limit: number | null;
  perks: string[];
  display_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  updated_at: string;
}

export async function loadAdminTiers(): Promise<AdminTier[]> {
  const supabase = await createClient();
  const { data: tiers } = await supabase
    .from("tiers")
    .select(
      "id, name, slug, description, annual_dues_cents, directory_listing, umbrella_account, umbrella_employee_limit, perks, display_order, stripe_product_id, stripe_price_id, updated_at",
    )
    .order("display_order", { ascending: true })
    .returns<TierRow[]>();
  if (!tiers) return [];

  interface MembershipCountRow {
    tier_id: string;
    stripe_subscription_id: string | null;
  }
  const { data: subs } = await supabase
    .from("memberships")
    .select("tier_id, stripe_subscription_id")
    .in("status", ["Active", "Grace_Period"])
    .not("stripe_subscription_id", "is", null)
    .returns<MembershipCountRow[]>();
  const counts = new Map<string, number>();
  for (const row of subs ?? []) {
    counts.set(row.tier_id, (counts.get(row.tier_id) ?? 0) + 1);
  }

  return tiers.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    annualDuesCents: row.annual_dues_cents,
    directoryListing: row.directory_listing,
    umbrellaAccount: row.umbrella_account,
    umbrellaEmployeeLimit: row.umbrella_employee_limit,
    perks: row.perks ?? [],
    displayOrder: row.display_order,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    activeSubscriberCount: counts.get(row.id) ?? 0,
    updatedAt: row.updated_at,
  }));
}
