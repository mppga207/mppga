"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/supabase/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  defaultLandingContent,
  type LandingContent,
} from "@/lib/mppga/admin/landingContent";

async function logAdminAction(
  actorProfileId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: null,
    action: "setting_change",
    payload: JSON.parse(JSON.stringify({ setting: "site_content", ...payload })),
  });
  if (error) {
    console.error("admin_action_log insert failed", error);
  }
}

/**
 * Filters a client-submitted content blob down to the keys the
 * `LandingContent` type knows about. Unknown sections / fields are
 * silently dropped — we don't trust the client to invent storage.
 */
function sanitizeContent(input: unknown): Record<string, Record<string, unknown>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const sectionKey of Object.keys(defaultLandingContent) as (keyof LandingContent)[]) {
    const incoming = source[sectionKey];
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      continue;
    }
    const defaults = defaultLandingContent[sectionKey] as Record<string, unknown>;
    const incomingRecord = incoming as Record<string, unknown>;
    const section: Record<string, unknown> = {};
    for (const fieldKey of Object.keys(defaults)) {
      const value = incomingRecord[fieldKey];
      if (value === undefined) continue;
      const existing = defaults[fieldKey];
      if (Array.isArray(existing) && Array.isArray(value)) {
        section[fieldKey] = value;
        continue;
      }
      if (typeof existing === typeof value) {
        section[fieldKey] = value;
      }
    }
    if (Object.keys(section).length > 0) {
      out[sectionKey] = section;
    }
  }
  return out;
}

export type SaveLandingContentResult =
  | { status: "ok"; updatedAt: string }
  | { status: "error"; reason: string };

export async function saveLandingContent(
  content: unknown,
): Promise<SaveLandingContentResult> {
  const session = await requireAdmin();
  const sanitized = sanitizeContent(content);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_content")
    .update({ content: JSON.parse(JSON.stringify(sanitized)) })
    .eq("id", "00000000-0000-0000-0000-000000000003")
    .select("updated_at")
    .single();
  if (error) {
    return { status: "error", reason: error.message };
  }

  await logAdminAction(session.user.id, {
    action: "save",
    section_count: Object.keys(sanitized).length,
  });

  // Landing copy can surface in any public route + email footers. Sweep
  // the entire route tree.
  revalidatePath("/", "layout");

  return { status: "ok", updatedAt: data.updated_at };
}

export async function resetLandingContent(): Promise<SaveLandingContentResult> {
  const session = await requireAdmin();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("site_content")
    .update({ content: {} })
    .eq("id", "00000000-0000-0000-0000-000000000003")
    .select("updated_at")
    .single();
  if (error) {
    return { status: "error", reason: error.message };
  }

  await logAdminAction(session.user.id, { action: "reset" });
  revalidatePath("/", "layout");

  return { status: "ok", updatedAt: data.updated_at };
}
