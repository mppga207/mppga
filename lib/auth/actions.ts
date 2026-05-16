"use server";

import { z } from "zod";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const tierSlugs = ["student", "professional", "corporate"] as const;
type TierSlug = (typeof tierSlugs)[number];

const joinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  full_name: z
    .string()
    .trim()
    .min(2, "Tell us your name.")
    .max(120, "Name is too long."),
  tier: z.enum(tierSlugs, {
    message: "Pick a tier.",
  }),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type AuthFormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

/**
 * `/join` server action. Sends a magic-link email and stashes the tier
 * slug + full name in `options.data` so the auth-callback route can
 * create the membership row on first sign-in.
 */
export async function joinMembership(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("name"),
    tier: formData.get("tier"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Check the form and try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
      data: {
        full_name: parsed.data.full_name,
        tier_slug: parsed.data.tier satisfies TierSlug,
        intent: "join",
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        "We couldn’t send the sign-in link. Double-check the email and try again.",
    };
  }

  return { status: "sent", email: parsed.data.email };
}

/**
 * `/sign-in` server action. Magic-link only — no passwords, no social
 * (auth-middleware.md §6.2). `shouldCreateUser: false` so the form
 * doesn't quietly create a fresh signup if someone mistypes their email.
 */
export async function signInWithMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first?.message ?? "Enter a valid email address.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    // Don't leak whether the email exists. Surface a generic success-ish
    // message either way, but log the actual error server-side.
    console.warn("sign-in OTP error", error.message);
  }

  return { status: "sent", email: parsed.data.email };
}
