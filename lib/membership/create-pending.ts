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

export interface OwnedSalon {
  name: string;
  address_line: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
}

export interface SalonAffiliation {
  /** Existing org chosen from the typeahead. */
  salonId?: string;
  /** Free-text name typed when no existing org matched. */
  salonNewName?: string;
  /**
   * Set when the signup is the owner of this salon (either the Salon
   * tier or any tier with the salon-owner toggle on). When set, the
   * profile is linked as `organization_id` AND becomes the org's
   * `primary_contact_profile_id`.
   */
  ownedSalon?: OwnedSalon;
}

export interface SignupContactDetails {
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  zip?: string | null;
}

export async function createPendingMembership(
  profileId: string,
  tierSlug: string,
  salon: SalonAffiliation = {},
  contact: SignupContactDetails = {},
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

  await applyContactDetails(client, profileId, contact);
  await linkSalonAffiliation(client, profileId, salon);

  return { status: "created" };
}

/**
 * Copy the address + phone collected on the Join form onto the
 * profile. The create_profile_on_signup trigger already wrote
 * first_name / last_name / full_name from raw_user_meta_data; the
 * remaining contact fields land here because the trigger doesn't try
 * to project everything (keeps it conflict-free with future metadata
 * additions). Errors are logged but never block the signup — an
 * empty address can be filled in from the dashboard later.
 */
async function applyContactDetails(
  client: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
  contact: SignupContactDetails,
): Promise<void> {
  const patch: {
    phone?: string | null;
    address_line?: string | null;
    city?: string | null;
    zip?: string | null;
  } = {};
  if (contact.phone !== undefined) {
    patch.phone = contact.phone && contact.phone.length > 0 ? contact.phone : null;
  }
  if (contact.addressLine !== undefined) {
    patch.address_line =
      contact.addressLine && contact.addressLine.length > 0
        ? contact.addressLine
        : null;
  }
  if (contact.city !== undefined) {
    patch.city = contact.city && contact.city.length > 0 ? contact.city : null;
  }
  if (contact.zip !== undefined) {
    patch.zip = contact.zip && contact.zip.length > 0 ? contact.zip : null;
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", profileId);
  if (error) {
    console.error("applyContactDetails: profile patch failed", error);
  }
}

/**
 * Link the signup to a salon. Three shapes:
 *   - `ownedSalon`: the member owns this salon. Create the org (or
 *     reuse a same-name match), set them as primary_contact and
 *     organization_id, and copy the salon details onto the row.
 *   - `salonId`: typeahead picked an existing row (employee
 *     affiliation, non-owner).
 *   - `salonNewName`: typed free-text that didn't match; create a
 *     stub org with primary_contact_profile_id = null so a future
 *     Salon-tier owner can claim it.
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
  let orgId: string | null = null;
  let claimOwnership = false;

  if (salon.ownedSalon) {
    claimOwnership = true;
    const trimmedName = salon.ownedSalon.name.trim();
    if (!trimmedName) return;

    const { data: existing } = await client
      .from("organizations")
      .select("id, primary_contact_profile_id")
      .ilike("name", trimmedName)
      .limit(1)
      .maybeSingle();

    if (existing?.id && existing.primary_contact_profile_id == null) {
      // An unclaimed stub for this name already exists (probably created
      // earlier by an employee signup). Claim it and update its details.
      const { error } = await client
        .from("organizations")
        .update({
          name: trimmedName,
          address_line: salon.ownedSalon.address_line,
          city: salon.ownedSalon.city,
          zip: salon.ownedSalon.zip,
          phone: salon.ownedSalon.phone,
          website: salon.ownedSalon.website,
          primary_contact_profile_id: profileId,
        })
        .eq("id", existing.id);
      if (error) {
        console.error("linkSalonAffiliation: org claim failed", error);
        return;
      }
      orgId = existing.id;
    } else if (existing?.id) {
      // Name match but already owned by someone else. Don't steal the
      // org; create a new one with the same name so the signup
      // succeeds. An admin can reconcile later.
      const { data: created, error: insertError } = await client
        .from("organizations")
        .insert({
          name: trimmedName,
          address_line: salon.ownedSalon.address_line,
          city: salon.ownedSalon.city,
          zip: salon.ownedSalon.zip,
          phone: salon.ownedSalon.phone,
          website: salon.ownedSalon.website,
          primary_contact_profile_id: profileId,
        })
        .select("id")
        .single();
      if (insertError || !created) {
        console.error("linkSalonAffiliation: owned org insert failed", insertError);
        return;
      }
      orgId = created.id;
    } else {
      const { data: created, error: insertError } = await client
        .from("organizations")
        .insert({
          name: trimmedName,
          address_line: salon.ownedSalon.address_line,
          city: salon.ownedSalon.city,
          zip: salon.ownedSalon.zip,
          phone: salon.ownedSalon.phone,
          website: salon.ownedSalon.website,
          primary_contact_profile_id: profileId,
        })
        .select("id")
        .single();
      if (insertError || !created) {
        console.error("linkSalonAffiliation: owned org insert failed", insertError);
        return;
      }
      orgId = created.id;
    }
  } else if (salon.salonId) {
    orgId = salon.salonId;
  } else if (salon.salonNewName && salon.salonNewName.trim().length > 0) {
    const trimmedName = salon.salonNewName.trim();
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
    return;
  }

  // Defensive: if claimOwnership path was taken and the FK update
  // above succeeded, we're done. If a separate-path owner came
  // through here (shouldn't happen given the branches above) we'd
  // still want primary_contact_profile_id set. The branches handle
  // it inline.
  void claimOwnership;
}
