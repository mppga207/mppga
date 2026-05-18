"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const tierSlugs = ["basic", "professional", "salon"] as const;
type TierSlug = (typeof tierSlugs)[number];

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.");

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

const joinSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: passwordSchema,
    first_name: z
      .string()
      .trim()
      .min(1, "Enter your first name.")
      .max(80, "First name is too long."),
    last_name: z
      .string()
      .trim()
      .min(1, "Enter your last name.")
      .max(80, "Last name is too long."),
    phone: optionalText(40, "Phone number"),
    address_line: optionalText(160, "Address"),
    city: optionalText(80, "City"),
    zip: optionalText(20, "Zip code"),
    tier: z.enum(tierSlugs, { message: "Pick a tier." }),
    salon_owner: z
      .union([z.literal("on"), z.literal("true")])
      .optional()
      .transform((v) => Boolean(v)),
    salon_name: optionalText(160, "Salon name"),
    salon_address_line: optionalText(160, "Salon address"),
    salon_city: optionalText(80, "Salon city"),
    salon_zip: optionalText(20, "Salon zip"),
    salon_phone: optionalText(40, "Salon phone"),
    salon_website: optionalText(200, "Salon website"),
    salon_id: z
      .string()
      .trim()
      .uuid()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    salon_new_name: optionalText(160, "Salon name"),
  })
  .superRefine((data, ctx) => {
    // Salon-tier signups ARE the salon: owner is forced on, and the
    // salon name is required because the org row gets created from
    // these fields. For other tiers, the toggle is optional, but if
    // it's on we still need a salon name.
    const ownerRequired = data.tier === "salon" || data.salon_owner;
    if (ownerRequired && !data.salon_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salon_name"],
        message: "Enter your salon's name.",
      });
    }
  });

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type AuthFormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

/**
 * `/join` server action. Creates the auth user via email + password and
 * stashes everything the auth-callback needs (tier slug, names, contact
 * details, salon affiliation OR salon-owner details) in `options.data`.
 * The callback materializes the membership row in `Awaiting_Payment`
 * and, when applicable, creates the salon organization
 * (auth-middleware.md §6.1).
 */
export async function joinMembership(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
    address_line: formData.get("address_line"),
    city: formData.get("city"),
    zip: formData.get("zip"),
    tier: formData.get("tier"),
    salon_owner: formData.get("salon_owner"),
    salon_name: formData.get("salon_name"),
    salon_address_line: formData.get("salon_address_line"),
    salon_city: formData.get("salon_city"),
    salon_zip: formData.get("salon_zip"),
    salon_phone: formData.get("salon_phone"),
    salon_website: formData.get("salon_website"),
    salon_id: formData.get("salon_id"),
    salon_new_name: formData.get("salon_new_name"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Check the form and try again.",
    };
  }

  const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();

  // Salon-tier signups ARE the salon. They never affiliate with an
  // existing org from the combobox, and the owner toggle is forced on.
  const isSalonOwner =
    parsed.data.tier === "salon" || parsed.data.salon_owner === true;

  // If they own a salon (or are signing up as one), the salon
  // affiliation combobox is hidden; drop any stray fields that came
  // through. Otherwise pick up the existing-salon link or the
  // typed-new-name fallback.
  const includeAffiliation = !isSalonOwner;
  const salonId = includeAffiliation ? parsed.data.salon_id : undefined;
  const salonAffiliationName = includeAffiliation
    ? parsed.data.salon_new_name
    : undefined;

  const ownedSalon = isSalonOwner && parsed.data.salon_name
    ? {
        name: parsed.data.salon_name,
        address_line: parsed.data.salon_address_line ?? null,
        city: parsed.data.salon_city ?? null,
        zip: parsed.data.salon_zip ?? null,
        phone: parsed.data.salon_phone ?? null,
        website: parsed.data.salon_website ?? null,
      }
    : null;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard`,
      data: {
        full_name: fullName,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone: parsed.data.phone ?? "",
        address_line: parsed.data.address_line ?? "",
        city: parsed.data.city ?? "",
        zip: parsed.data.zip ?? "",
        tier_slug: parsed.data.tier satisfies TierSlug,
        intent: "join",
        ...(salonId ? { salon_id: salonId } : {}),
        ...(salonAffiliationName && !salonId
          ? { salon_new_name: salonAffiliationName }
          : {}),
        ...(ownedSalon ? { owned_salon: ownedSalon } : {}),
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        "We couldn’t create your account. Double-check the email and try again.",
    };
  }

  return { status: "sent", email: parsed.data.email };
}

/**
 * `/sign-in` server action. Email + password sign-in
 * (auth-middleware.md §6.2). On success, the session cookie is written
 * by the server client and we redirect straight to `/dashboard`;
 * middleware then routes admins to `/admin` and members per the status
 * matrix. On failure we return a generic message that doesn't leak
 * whether the email exists.
 */
export async function signInWithEmailPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "That email and password don’t match an account.",
    };
  }

  redirect("/dashboard");
}
