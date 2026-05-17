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

const joinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: passwordSchema,
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
  password: z.string().min(1, "Enter your password."),
});

export type AuthFormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

/**
 * `/join` server action. Creates the auth user via email + password and
 * stashes the tier slug + full name in `options.data` so the
 * auth-callback route can create the membership row in `Awaiting_Payment`
 * after the verification email is clicked (auth-middleware.md §6.1).
 */
export async function joinMembership(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard`,
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
