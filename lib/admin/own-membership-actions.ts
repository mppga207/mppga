"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createClient,
  createServiceRoleClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/session";

const TIER_SLUGS = ["basic", "professional", "salon"] as const;
type TierSlug = (typeof TIER_SLUGS)[number];

function isTier(value: string): value is TierSlug {
  return (TIER_SLUGS as readonly string[]).includes(value);
}

/**
 * Creates an Honorary memberships row for the calling admin so they can
 * use the member portal as themselves without ever paying dues.
 * Honorary is the data-model.md sanctioned "lifetime access, no
 * billing, admin-assigned only" status — the row carries no Stripe
 * fields and no expires_at.
 *
 * After the row is written we call `refreshSession()` on the
 * user-scoped client so the auth hook re-runs and the JWT
 * membership_status claim updates to Honorary in-place. Other
 * devices get a forced sign-out (matching the
 * membership-status-sync pattern) so their next request mints a
 * fresh token with the new claim.
 */
export async function createOwnAdminMembership(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin("/admin");

  const tierSlugRaw = String(formData.get("tier") ?? "").trim();
  if (!isTier(tierSlugRaw)) {
    redirect("/admin?own_membership=invalid_tier");
  }

  if (!isSupabaseConfigured()) {
    redirect("/admin?own_membership=error");
  }

  // Service role required: memberships RLS forbids authenticated
  // INSERT (data-model.md §5.4). The requireAdmin check above plus
  // the admin role claim gate this call.
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", session.user.id)
    .maybeSingle();
  if (existing) {
    redirect("/admin?own_membership=already");
  }

  const { data: tier } = await supabase
    .from("tiers")
    .select("id")
    .eq("slug", tierSlugRaw)
    .maybeSingle();
  if (!tier) {
    redirect("/admin?own_membership=invalid_tier");
  }

  const { error } = await supabase.from("memberships").insert({
    profile_id: session.user.id,
    tier_id: tier.id,
    status: "Honorary",
  });
  if (error) {
    console.error("createOwnAdminMembership insert failed", error);
    redirect("/admin?own_membership=error");
  }

  // Mirror the membership-status-sync pattern: kill sessions on other
  // devices so their next request mints a fresh JWT claim.
  try {
    await supabase.auth.admin.signOut(session.user.id, "others");
  } catch (e) {
    console.warn("admin signOut(others) after own-membership create failed", e);
  }

  // Force a token refresh on the current session so the auth hook
  // re-runs and the JWT membership_status claim picks up the new
  // Honorary row in place. Without this the admin would have to sign
  // out and back in before middleware would let them into /dashboard.
  try {
    const userClient = await createClient();
    await userClient.auth.refreshSession();
  } catch (e) {
    console.warn("session refresh after own-membership create failed", e);
  }

  revalidatePath("/admin");
  redirect("/admin?own_membership=ok");
}
