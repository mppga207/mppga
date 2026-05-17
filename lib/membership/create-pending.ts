import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Insert a `memberships` row for a brand-new signup. Called from the
 * auth-callback route on the first hit after the email-verification
 * exchange.
 *
 * Default status is `Awaiting_Payment`. When the admin toggle
 * `site_settings.signup_skip_payment` is true (testing mode while
 * Stripe isn't wired up), the row goes in as `Active` with a one-year
 * expires_at and `auth.users.raw_app_meta_data.membership_status` is
 * updated so the middleware lets the new account straight through to
 * /dashboard.
 *
 * Idempotent: a UNIQUE on `memberships.profile_id` means a second call
 * for the same profile is a no-op via the existence check + the
 * unique-violation fallback. Service role is required because RLS
 * forbids any authenticated INSERT on `memberships` (data-model.md
 * §5.4).
 */
export type CreatePendingResult =
  | { status: "created" }
  | { status: "already_exists" }
  | { status: "unknown_tier"; slug: string }
  | { status: "error"; reason: string };

export interface SalonAffiliation {
  /** Existing org chosen from the typeahead. */
  salonId?: string;
  /** Free-text name typed when no existing org matched. */
  salonNewName?: string;
}

export async function createPendingMembership(
  profileId: string,
  tierSlug: string,
  salon: SalonAffiliation = {},
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

  const { data: settings } = await client
    .from("site_settings")
    .select("signup_skip_payment")
    .maybeSingle();
  const skipPayment = settings?.signup_skip_payment === true;

  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

  const initialStatus = skipPayment ? "Active" : "Awaiting_Payment";
  const expiresAt = skipPayment ? oneYearOut.toISOString() : null;

  const { error: insertError } = await client.from("memberships").insert({
    profile_id: profileId,
    tier_id: tier.id,
    status: initialStatus,
    expires_at: expiresAt,
  });
  if (insertError) {
    // A concurrent insert from a duplicate callback can race past the
    // existence check above; treat the unique-violation as a no-op.
    if (insertError.code === "23505") {
      return { status: "already_exists" };
    }
    return { status: "error", reason: insertError.message };
  }

  // Mirror the membership status onto auth.users.raw_app_meta_data so
  // the next call to supabase.auth.getUser() in middleware sees the
  // current status without waiting for a JWT refresh.
  const { error: metaError } = await client.auth.admin.updateUserById(
    profileId,
    { app_metadata: { membership_status: initialStatus } },
  );
  if (metaError) {
    return { status: "error", reason: metaError.message };
  }

  await linkSalonAffiliation(client, profileId, salon);

  return { status: "created" };
}

/**
 * Link a non-owner signup to their salon. Resolves the org id from one
 * of two inputs:
 *   - `salonId`: typeahead picked an existing row.
 *   - `salonNewName`: typed free-text; case-insensitive match wins, or
 *     we create a stub row with primary_contact_profile_id left null
 *     so a future Salon-tier subscription can claim it.
 *
 * Linking failures are logged but never block the membership creation
 * the caller depends on. The signup completes; an admin can correct
 * the affiliation later from the Members tab.
 */
async function linkSalonAffiliation(
  client: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
  salon: SalonAffiliation,
): Promise<void> {
  const trimmedName = salon.salonNewName?.trim();
  let orgId: string | null = null;

  if (salon.salonId) {
    orgId = salon.salonId;
  } else if (trimmedName && trimmedName.length > 0) {
    const { data: existing } = await client
      .from("organizations")
      .select("id")
      .ilike("name", trimmedName)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      orgId = existing.id;
    } else {
      const { data: created, error: insertError } = await client
        .from("organizations")
        .insert({ name: trimmedName })
        .select("id")
        .single();
      if (insertError || !created) {
        console.error("linkSalonAffiliation: org insert failed", insertError);
        return;
      }
      orgId = created.id;
    }
  }

  if (!orgId) return;

  const { error: updateError } = await client
    .from("profiles")
    .update({ organization_id: orgId })
    .eq("id", profileId);
  if (updateError) {
    console.error("linkSalonAffiliation: profile update failed", updateError);
  }
}
