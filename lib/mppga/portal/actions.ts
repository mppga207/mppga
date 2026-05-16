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
