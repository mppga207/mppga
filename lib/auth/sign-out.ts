"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Single sign-out path. Both admin and member sign-outs land at `/`
 * (auth-middleware.md §6.3). Never redirect to a deep link the user
 * just lost access to.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
