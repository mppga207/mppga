"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/supabase/session";

export interface UpdateProfileInput {
  fullName: string;
  phone: string | null;
}

export interface UpdateProfileResult {
  status: "ok" | "invalid" | "error";
  message?: string;
}

/**
 * Updates the signed-in member's editable profile fields. RLS limits the
 * write to `full_name` and `phone` (`data-model.md` §5.2) — role and
 * organization are admin-only and not exposed here.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const session = await requireSession("/dashboard/profile");

  const fullName = input.fullName.trim();
  if (fullName.length < 1 || fullName.length > 120) {
    return { status: "invalid", message: "Enter a name between 1 and 120 characters." };
  }

  const phone = input.phone?.trim() ? input.phone.trim() : null;
  if (phone && phone.length > 40) {
    return { status: "invalid", message: "Phone is too long." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", session.user.id);

  if (error) {
    return { status: "error", message: error.message };
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

export interface UpdateDirectoryListingInput {
  displayName: string;
  bio: string;
  businessPhone: string;
  personalMobile: string;
  publicEmail: string;
  specialties: string[];
}

export interface UpdateDirectoryListingResult {
  status: "ok" | "invalid" | "error";
  message?: string;
}

/**
 * Edit the free-text + contact fields on a member's directory listing.
 * Address / city / state are excluded — they round-trip through the
 * geocoder (directory-search.md §4.2) which isn't wired yet
 * (Track 5 blocking decision #1). Visibility toggles stay on
 * `toggleDirectoryFlag` above.
 */
export async function updateDirectoryListing(
  input: UpdateDirectoryListingInput,
): Promise<UpdateDirectoryListingResult> {
  const session = await requireSession("/dashboard/directory");

  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) {
    return {
      status: "invalid",
      message: "Display name must be between 1 and 80 characters.",
    };
  }

  const bio = input.bio.trim();
  if (bio.length > 500) {
    return {
      status: "invalid",
      message: "Bio is too long — keep it under 500 characters.",
    };
  }

  const businessPhone = input.businessPhone.trim();
  const personalMobile = input.personalMobile.trim();
  const publicEmail = input.publicEmail.trim();
  if (businessPhone.length > 40 || personalMobile.length > 40) {
    return { status: "invalid", message: "Phone number is too long." };
  }
  if (publicEmail.length > 254) {
    return { status: "invalid", message: "Email address is too long." };
  }
  if (publicEmail && !publicEmail.includes("@")) {
    return { status: "invalid", message: "Enter a valid email address." };
  }

  const specialties = Array.from(
    new Set(
      input.specialties
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 60),
    ),
  );
  if (specialties.length > 20) {
    return { status: "invalid", message: "Pick up to 20 specialties." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("directory_listings")
    .update({
      display_name: displayName,
      bio: bio.length > 0 ? bio : null,
      business_phone: businessPhone.length > 0 ? businessPhone : null,
      personal_mobile: personalMobile.length > 0 ? personalMobile : null,
      public_email: publicEmail.length > 0 ? publicEmail : null,
      specialties,
    })
    .eq("profile_id", session.user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard");
  return { status: "ok" };
}
