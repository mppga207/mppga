"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { env } from "@/lib/env";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { requireSession } from "@/lib/supabase/session";

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  zip: string | null;
}

export interface UpdateProfileResult {
  status: "ok" | "invalid" | "error";
  message?: string;
}

/**
 * Updates the signed-in member's editable profile fields. RLS limits
 * the write to the owner row (data-model.md §5.2). The column split
 * (member-editable contact vs. admin-only role/org) is enforced here
 * in the server action — `role` and `organization_id` are never
 * passed through, so a malicious caller couldn't elevate themselves
 * even by tampering with the form.
 *
 * Writes first_name + last_name + a recomposed full_name in the same
 * update so legacy code reading full_name keeps working.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const session = await requireSession("/dashboard/profile");

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length < 1 || firstName.length > 80) {
    return { status: "invalid", message: "Enter a first name." };
  }
  if (lastName.length < 1 || lastName.length > 80) {
    return { status: "invalid", message: "Enter a last name." };
  }
  const fullName = `${firstName} ${lastName}`.trim();

  const phone = trimToNull(input.phone, 40);
  if (phone instanceof Error) {
    return { status: "invalid", message: "Phone is too long." };
  }
  const addressLine = trimToNull(input.addressLine, 160);
  if (addressLine instanceof Error) {
    return { status: "invalid", message: "Address is too long." };
  }
  const city = trimToNull(input.city, 80);
  if (city instanceof Error) {
    return { status: "invalid", message: "City is too long." };
  }
  const zip = trimToNull(input.zip, 20);
  if (zip instanceof Error) {
    return { status: "invalid", message: "Zip code is too long." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      address_line: addressLine,
      city,
      zip,
    })
    .eq("id", session.user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { status: "ok" };
}

function trimToNull(raw: string | null, max: number): string | null | Error {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > max) return new Error("too long");
  return trimmed;
}

export interface UpdateSalonInput {
  /**
   * If the member already owns a salon (their organization_id row has
   * primary_contact_profile_id === their id), the form sends the same
   * id back and we update the row in place.
   *
   * If they're declaring themselves a salon owner for the first time
   * (no current org, or affiliated to someone else's salon), the id
   * is null and we create a new organization, link it as their
   * `organization_id`, and set them as `primary_contact_profile_id`.
   */
  organizationId: string | null;
  name: string;
  addressLine: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
}

export interface UpdateSalonResult {
  status: "ok" | "invalid" | "error";
  message?: string;
}

/**
 * Create or update the signed-in member's owned-salon record. Creating
 * goes through the service role because the new org needs the member's
 * organization_id set as part of the same logical change, and the
 * profiles RLS policy lets them write their own row but the org
 * insert needs a paired profile.organization_id write. Updates of an
 * existing owned org use the user-scoped client and the
 * `organizations_owner_update` policy added in the same migration.
 */
export async function updateSalonInfo(
  input: UpdateSalonInput,
): Promise<UpdateSalonResult> {
  const session = await requireSession("/dashboard/profile");

  const name = input.name.trim();
  if (name.length < 1 || name.length > 160) {
    return { status: "invalid", message: "Enter your salon's name." };
  }
  const addressLine = trimToNull(input.addressLine, 160);
  if (addressLine instanceof Error) {
    return { status: "invalid", message: "Salon address is too long." };
  }
  const city = trimToNull(input.city, 80);
  if (city instanceof Error) {
    return { status: "invalid", message: "Salon city is too long." };
  }
  const zip = trimToNull(input.zip, 20);
  if (zip instanceof Error) {
    return { status: "invalid", message: "Salon zip is too long." };
  }
  const phone = trimToNull(input.phone, 40);
  if (phone instanceof Error) {
    return { status: "invalid", message: "Salon phone is too long." };
  }
  const website = trimToNull(input.website, 200);
  if (website instanceof Error) {
    return { status: "invalid", message: "Salon website is too long." };
  }

  if (input.organizationId) {
    // Update path: the user-scoped client + the
    // `organizations_owner_update` policy keep this owner-only.
    const supabase = await createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        address_line: addressLine,
        city,
        zip,
        phone,
        website,
      })
      .eq("id", input.organizationId);
    if (error) {
      return { status: "error", message: error.message };
    }
  } else {
    // First-time owner declaration. Service role: we need to insert
    // the org AND set the profile's organization_id in the same
    // logical change. Organizations INSERT is admin-only in RLS, so
    // the user-scoped client can't do the insert itself. Justified
    // here per auth-middleware.md §4.2: the request is from the
    // authenticated owner setting up their own salon, and the
    // primary_contact gets pinned to their own profile id so they
    // can never claim someone else's row.
    const client = createServiceRoleClient();
    const { data: created, error: insertError } = await client
      .from("organizations")
      .insert({
        name,
        address_line: addressLine,
        city,
        zip,
        phone,
        website,
        primary_contact_profile_id: session.user.id,
      })
      .select("id")
      .single();
    if (insertError || !created) {
      return {
        status: "error",
        message: insertError?.message ?? "Could not create your salon.",
      };
    }
    const { error: linkError } = await client
      .from("profiles")
      .update({ organization_id: created.id })
      .eq("id", session.user.id);
    if (linkError) {
      return { status: "error", message: linkError.message };
    }
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { status: "ok" };
}

export type DirectoryToggleFlag =
  | "is_visible"
  | "show_business_phone"
  | "show_personal_mobile"
  | "show_address"
  | "show_public_email";

export interface ToggleDirectoryFlagInput {
  flag: DirectoryToggleFlag;
  value: boolean;
}

export interface ToggleDirectoryFlagResult {
  status: "ok" | "invalid" | "error";
  message?: string;
}

function flagPatch(
  flag: DirectoryToggleFlag,
  value: boolean,
):
  | { is_visible: boolean }
  | { show_business_phone: boolean }
  | { show_personal_mobile: boolean }
  | { show_address: boolean }
  | { show_public_email: boolean }
  | null {
  switch (flag) {
    case "is_visible":
      return { is_visible: value };
    case "show_business_phone":
      return { show_business_phone: value };
    case "show_personal_mobile":
      return { show_personal_mobile: value };
    case "show_address":
      return { show_address: value };
    case "show_public_email":
      return { show_public_email: value };
    default:
      return null;
  }
}

/**
 * Flips one visibility flag on the signed-in member's directory listing.
 * Address-line / phone / email value edits are not handled here — those
 * require either the geocoder (Track 5 blocking decision #1) or
 * normalization helpers that aren't built yet.
 */
export async function toggleDirectoryFlag(
  input: ToggleDirectoryFlagInput,
): Promise<ToggleDirectoryFlagResult> {
  const session = await requireSession("/dashboard/directory");

  const patch = flagPatch(input.flag, input.value);
  if (!patch) {
    return { status: "invalid", message: "Unknown flag." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("directory_listings")
    .update(patch)
    .eq("profile_id", session.user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard");
  return { status: "ok" };
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export interface ChangeEmailInput {
  newEmail: string;
}

export interface ChangeEmailResult {
  status: "ok" | "invalid" | "unchanged" | "error";
  message?: string;
}

/**
 * Begin an email-change flow for the signed-in member. Supabase Auth
 * sends a confirmation link to the new address; until the member clicks
 * it, auth.users.email stays on the old address (and so does
 * profiles.email via the mirror_auth_email trigger). The change is
 * self-serve: no admin involvement needed, and the confirmation
 * round-trip is the security gate that prevents someone from hijacking
 * an account with a one-click form submit.
 */
export async function changeEmail(
  input: ChangeEmailInput,
): Promise<ChangeEmailResult> {
  const session = await requireSession("/dashboard/profile");

  const parsed = emailSchema.safeParse(input.newEmail);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a valid email.";
    return { status: "invalid", message };
  }

  const newEmail = parsed.data;
  const currentEmail = (session.user.email ?? "").trim().toLowerCase();
  if (newEmail === currentEmail) {
    return {
      status: "unchanged",
      message: "That's already your email on file.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard/profile` },
  );

  if (error) {
    return {
      status: "error",
      message:
        error.message.includes("already")
          ? "That email is already linked to another account."
          : "We couldn't start the email change. Try again in a moment.",
    };
  }

  return { status: "ok" };
}
