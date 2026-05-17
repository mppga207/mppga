import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Insert a `memberships` row in `Awaiting_Payment` for a brand-new
 * signup. Called from the auth-callback route on the first hit after
 * the email-verification exchange.
 *
 * Idempotent: a UNIQUE on `memberships.profile_id` means a second call
 * for the same profile is a no-op via ON CONFLICT. Service role is
 * required because RLS forbids any authenticated INSERT on
 * `memberships` (data-model.md §5.4).
 */
export type CreatePendingResult =
  | { status: "created" }
  | { status: "already_exists" }
  | { status: "unknown_tier"; slug: string }
  | { status: "error"; reason: string };

export async function createPendingMembership(
  profileId: string,
  tierSlug: string,
): Promise<CreatePendingResult> {
  // Service role: the join callback has no other route to seed the
  // membership row because data-model.md §5.4 forbids authenticated
  // INSERT on `memberships`.
  const client = createServiceRoleClient();

  const { data: tier, error: tierError } = await client
    .from("tiers")
    .select("id")
    .eq("slug", tierSlug)
    .maybeSingle();
  if (tierError) {
    return { status: "error", reason: tierError.message };
  }
  if (!tier) {
    return { status: "unknown_tier", slug: tierSlug };
  }

  const { error: existsError, data: existing } = await client
    .from("memberships")
    .select("id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();
  if (existsError) {
    return { status: "error", reason: existsError.message };
  }
  if (existing) {
    return { status: "already_exists" };
  }

  const { error: insertError } = await client.from("memberships").insert({
    profile_id: profileId,
    tier_id: tier.id,
    status: "Awaiting_Payment",
  });
  if (insertError) {
    // A concurrent insert from a duplicate callback can race past the
    // existence check above; treat the unique-violation as a no-op.
    if (insertError.code === "23505") {
      return { status: "already_exists" };
    }
    return { status: "error", reason: insertError.message };
  }

  return { status: "created" };
}
