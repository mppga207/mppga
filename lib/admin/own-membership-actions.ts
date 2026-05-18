"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
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
 * The JWT membership_status claim refreshes on the admin's next
 * sign-in (auth-middleware.md §2.2). To make /dashboard reachable
 * right away the admin needs to sign out and back in once after the
 * row is created; this action triggers signOut on other devices to
 * match the membership-status-sync pattern.
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
  // devices so the next request there gets a fresh JWT claim. The
  // current session keeps its token until natural refresh; the success
  // banner tells the admin to sign out + back in to reach /dashboard.
  try {
    await supabase.auth.admin.signOut(session.user.id, "others");
  } catch (e) {
    console.warn("admin signOut(others) after own-membership create failed", e);
  }

  revalidatePath("/admin");
  redirect("/admin?own_membership=ok");
}
