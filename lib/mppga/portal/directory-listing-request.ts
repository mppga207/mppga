"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireSession } from "@/lib/supabase/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Member-submitted "please set up my directory listing" form.
 *
 * The `directory_listings` row itself can't be created from here yet:
 * the row carries a geocoded `geography(Point, 4326)` and the geocoder
 * provider is still TBD (phase-1-buildout.md blocking decision #1).
 * Until that lands, this action routes the structured request through
 * `contact_submissions` so the board can create the listing manually,
 * exactly as the previous "email us" copy described.
 */
export async function requestDirectoryListingAction(
  formData: FormData,
): Promise<void> {
  const session = await requireSession("/dashboard/directory");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const addressLine = String(formData.get("address_line") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "ME").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const businessPhone = String(formData.get("business_phone") ?? "").trim();
  const publicEmail = String(formData.get("public_email") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();

  if (
    !displayName ||
    displayName.length > 120 ||
    !addressLine ||
    addressLine.length > 160 ||
    !city ||
    city.length > 80 ||
    state.length > 40 ||
    !zip ||
    zip.length > 20 ||
    businessPhone.length > 40 ||
    publicEmail.length > 200 ||
    bio.length > 1000 ||
    !contactName ||
    contactName.length > 120 ||
    !contactEmail ||
    contactEmail.length > 200 ||
    !EMAIL_RE.test(contactEmail) ||
    (publicEmail !== "" && !EMAIL_RE.test(publicEmail))
  ) {
    redirect("/dashboard/directory?status=invalid");
  }

  if (!isSupabaseConfigured()) {
    redirect("/dashboard/directory?status=error");
  }

  const lines = [
    `Directory listing request from ${contactName} (${contactEmail}).`,
    `Member profile ID: ${session.user.id}`,
    "",
    `Display name: ${displayName}`,
    `Address: ${addressLine}, ${city}, ${state} ${zip}`,
  ];
  if (businessPhone) lines.push(`Business phone: ${businessPhone}`);
  if (publicEmail) lines.push(`Public email: ${publicEmail}`);
  if (bio) {
    lines.push("");
    lines.push("Bio:");
    lines.push(bio);
  }
  const message = lines.join("\n");

  const h = await headers();
  const userAgent = h.get("user-agent");
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ipAddress = forwarded ? forwarded.split(",")[0]?.trim() : null;

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name: contactName,
    email: contactEmail,
    topic: "membership",
    message,
    user_agent: userAgent,
    ip_address: ipAddress,
  });
  if (error) {
    console.error("directory listing request insert failed", error);
    redirect("/dashboard/directory?status=error");
  }
  redirect("/dashboard/directory?status=requested");
}
