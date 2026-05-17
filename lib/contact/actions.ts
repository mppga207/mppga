"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ContactTopic } from "@/types/database";

const TOPICS: ReadonlySet<ContactTopic> = new Set([
  "membership",
  "events",
  "sponsorship",
  "press",
  "other",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTopic(value: string): value is ContactTopic {
  return TOPICS.has(value as ContactTopic);
}

export async function submitContactAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (
    !name ||
    name.length > 120 ||
    !email ||
    email.length > 200 ||
    !EMAIL_RE.test(email) ||
    !isTopic(topic) ||
    !message ||
    message.length > 5000
  ) {
    redirect("/contact?status=invalid");
  }

  if (!isSupabaseConfigured()) {
    redirect("/contact?status=email");
  }

  const h = await headers();
  const userAgent = h.get("user-agent");
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip");
  const ipAddress = forwarded ? forwarded.split(",")[0]?.trim() : null;

  // contact_submissions_public_insert RLS lets the anon role write —
  // user-scoped client (which falls through to anon for signed-out
  // requests) is correct here.
  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name,
    email,
    topic,
    message,
    user_agent: userAgent,
    ip_address: ipAddress,
  });
  if (error) {
    console.error("contact_submissions insert failed", error);
    redirect("/contact?status=error");
  }
  redirect("/contact?status=sent");
}
