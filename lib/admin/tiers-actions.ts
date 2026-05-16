"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { seedTierPrice, updateTierDues } from "@/lib/stripe/tier-price-update";

async function logAdminAction(
  actorProfileId: string,
  action: "tier_change" | "setting_change",
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: null,
    action,
    payload: JSON.parse(JSON.stringify(payload)),
  });
  if (error) {
    console.error("admin_action_log insert failed", action, error);
  }
}

function tierBackHref(tierId: string): string {
  return `/admin/settings/tiers#tier-${tierId}`;
}

// =========================================================================
// Tier metadata (name + description + benefit flags + display order)
//
// These edits don't touch Stripe. Pricing changes are gated by their own
// confirmation flow below.
// =========================================================================

export async function updateTierFieldsAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const tierId = String(formData.get("tier_id") ?? "");
  if (!tierId) redirect("/admin/settings/tiers?error=missing_tier");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const displayOrder = Number(formData.get("display_order") ?? 0);
  if (!name) {
    redirect(`${tierBackHref(tierId)}?error=invalid_input`);
  }
  if (!Number.isInteger(displayOrder)) {
    redirect(`${tierBackHref(tierId)}?error=invalid_input`);
  }

  const supabase = createServiceRoleClient();
  const { data: prior } = await supabase
    .from("tiers")
    .select(
      "name, description, voting_rights, directory_listing, corporate_umbrella, display_order",
    )
    .eq("id", tierId)
    .maybeSingle();

  const updates = {
    name,
    description,
    voting_rights: formData.get("voting_rights") != null,
    directory_listing: formData.get("directory_listing") != null,
    corporate_umbrella: formData.get("corporate_umbrella") != null,
    display_order: displayOrder,
  };

  const { error } = await supabase.from("tiers").update(updates).eq("id", tierId);
  if (error) {
    redirect(
      `${tierBackHref(tierId)}?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logAdminAction(session.user.id, "tier_change", {
    tier_id: tierId,
    action: "metadata_edit",
    prior,
    next: updates,
  });

  revalidatePath("/admin/settings/tiers");
  revalidatePath("/join");
  redirect(`${tierBackHref(tierId)}?ok=metadata_saved`);
}

// =========================================================================
// Tier dues edit
//
// Dispatches between the bootstrap (seed) path and the regular dues edit
// per stripe-architecture.md §6.5. The user-facing prompt and the audit
// log both record the migrated-subscriber count.
// =========================================================================

export async function updateTierDuesAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const tierId = String(formData.get("tier_id") ?? "");
  if (!tierId) redirect("/admin/settings/tiers?error=missing_tier");

  const dollarsRaw = formData.get("annual_dues_dollars");
  const dollars = Number(dollarsRaw ?? NaN);
  if (!Number.isFinite(dollars) || dollars < 0) {
    redirect(`${tierBackHref(tierId)}?error=invalid_amount`);
  }
  const amountCents = Math.round(dollars * 100);

  const supabase = createServiceRoleClient();
  const { data: tier } = await supabase
    .from("tiers")
    .select("id, name, stripe_product_id, stripe_price_id, annual_dues_cents")
    .eq("id", tierId)
    .maybeSingle();
  if (!tier) {
    redirect(`${tierBackHref(tierId)}?error=tier_not_found`);
  }

  const isBootstrap = !tier.stripe_price_id;
  const result = isBootstrap
    ? await seedTierPrice({ tierId, amountCents })
    : await updateTierDues({ tierId, newAmountCents: amountCents });

  if (result.status === "no_change") {
    redirect(`${tierBackHref(tierId)}?ok=no_change`);
  }
  if (result.status === "no_existing_price") {
    // Defensive: the bootstrap branch should cover this. If we hit it,
    // surface a clean error rather than crash.
    redirect(`${tierBackHref(tierId)}?error=no_existing_price`);
  }
  if (result.status === "tier_not_found") {
    redirect(`${tierBackHref(tierId)}?error=tier_not_found`);
  }
  if (result.status === "error") {
    redirect(
      `${tierBackHref(tierId)}?error=${encodeURIComponent(result.reason)}`,
    );
  }

  await logAdminAction(session.user.id, "setting_change", {
    tier_id: tierId,
    action: isBootstrap ? "seed_tier_price" : "update_tier_dues",
    old_amount_cents: tier.annual_dues_cents,
    new_amount_cents: amountCents,
    new_price_id: result.newPriceId,
    subscriptions_updated: result.subscriptionsUpdated,
  });

  revalidatePath("/admin/settings/tiers");
  revalidatePath("/join");
  redirect(
    `${tierBackHref(tierId)}?ok=dues_saved&migrated=${result.subscriptionsUpdated}${isBootstrap ? "&bootstrap=1" : ""}`,
  );
}
