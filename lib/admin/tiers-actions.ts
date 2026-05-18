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
  if (!name) {
    redirect(`${tierBackHref(tierId)}?error=invalid_input`);
  }

  const supabase = createServiceRoleClient();
  const { data: prior } = await supabase
    .from("tiers")
    .select(
      "name, description, directory_listing, umbrella_account, umbrella_employee_limit, perks",
    )
    .eq("id", tierId)
    .maybeSingle();

  const umbrellaOn = formData.get("umbrella_account") != null;
  let umbrellaEmployeeLimit: number | null = null;
  if (umbrellaOn) {
    const raw = formData.get("umbrella_employee_limit");
    const parsed = Number(raw ?? NaN);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      redirect(`${tierBackHref(tierId)}?error=invalid_employee_limit`);
    }
    umbrellaEmployeeLimit = parsed;
  }

  // Repeated <input name="perks"> rows from the admin form. Trim each
  // line and drop empties so a leftover blank row doesn't end up as a
  // rendered bullet on /join.
  const perks = formData
    .getAll("perks")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  const updates = {
    name,
    description,
    directory_listing: formData.get("directory_listing") != null,
    umbrella_account: umbrellaOn,
    umbrella_employee_limit: umbrellaEmployeeLimit,
    perks,
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

// =========================================================================
// Tier reorder — up/down arrows on the tier list
//
// Swaps a tier's `display_order` with the adjacent tier's. Direction is
// 'up' (toward the top) or 'down'. Top-of-list moving up and
// bottom-of-list moving down are no-ops; the UI disables the buttons in
// those cases but we guard server-side too.
// =========================================================================

export async function moveTierAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const tierId = String(formData.get("tier_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!tierId || (direction !== "up" && direction !== "down")) {
    redirect("/admin/settings/tiers?error=invalid_input");
  }

  const supabase = createServiceRoleClient();

  const { data: current } = await supabase
    .from("tiers")
    .select("id, display_order")
    .eq("id", tierId)
    .maybeSingle();
  if (!current) {
    redirect("/admin/settings/tiers?error=tier_not_found");
  }

  // Adjacent tier in the requested direction:
  //   up   = the largest display_order that is still less than current
  //   down = the smallest display_order that is still greater than current
  const query = supabase
    .from("tiers")
    .select("id, display_order")
    .limit(1);
  const { data: neighbours } =
    direction === "up"
      ? await query
          .lt("display_order", current.display_order)
          .order("display_order", { ascending: false })
      : await query
          .gt("display_order", current.display_order)
          .order("display_order", { ascending: true });

  const neighbour = neighbours?.[0];
  if (!neighbour) {
    // Already at the end of the list — no-op.
    redirect("/admin/settings/tiers");
  }

  // Swap. Two updates inside a best-effort sequential pair; tier count is
  // tiny (3) so contention isn't a concern.
  const { error: e1 } = await supabase
    .from("tiers")
    .update({ display_order: neighbour.display_order })
    .eq("id", current.id);
  const { error: e2 } = await supabase
    .from("tiers")
    .update({ display_order: current.display_order })
    .eq("id", neighbour.id);
  if (e1 || e2) {
    redirect(
      `/admin/settings/tiers?error=${encodeURIComponent((e1 ?? e2)!.message)}`,
    );
  }

  await logAdminAction(session.user.id, "tier_change", {
    tier_id: tierId,
    action: "reorder",
    direction,
    swapped_with: neighbour.id,
  });

  revalidatePath("/admin/settings/tiers");
  revalidatePath("/join");
  redirect("/admin/settings/tiers");
}
