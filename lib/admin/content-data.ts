import { createClient } from "@/lib/supabase/server";
import {
  defaultLandingContent,
  type LandingContent,
} from "@/lib/mppga/admin/landingContent";

/**
 * Deep-merges a partial overlay onto the defaults. The DB stores only
 * the fields the admin has edited; everything else falls back to the
 * canonical shape in `landingContent.ts`. We never trust the overlay
 * for shape — extra keys, missing keys, wrong types all collapse back
 * to defaults.
 */
function mergeOverlay(
  defaults: LandingContent,
  overlay: unknown,
): LandingContent {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) {
    return defaults;
  }
  const result = JSON.parse(JSON.stringify(defaults)) as LandingContent;
  const o = overlay as Record<string, unknown>;
  for (const sectionKey of Object.keys(result) as (keyof LandingContent)[]) {
    const overlaySection = o[sectionKey];
    if (
      !overlaySection ||
      typeof overlaySection !== "object" ||
      Array.isArray(overlaySection)
    ) {
      continue;
    }
    const overlayRecord = overlaySection as Record<string, unknown>;
    const target = result[sectionKey] as Record<string, unknown>;
    for (const fieldKey of Object.keys(target)) {
      const value = overlayRecord[fieldKey];
      if (value === undefined) continue;
      const existing = target[fieldKey];
      // Preserve array shape — if the default is an array, the overlay
      // must also be an array of the same primitive shape, otherwise fall back.
      if (Array.isArray(existing) && Array.isArray(value)) {
        target[fieldKey] = value as unknown[];
        continue;
      }
      if (typeof existing === typeof value) {
        target[fieldKey] = value as unknown;
      }
    }
  }
  return result;
}

export interface LandingContentLoaded {
  content: LandingContent;
  isDefault: boolean;
  updatedAt: string | null;
}

export async function loadLandingContent(): Promise<LandingContentLoaded> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("content, updated_at")
    .limit(1)
    .maybeSingle();
  if (!data) {
    return {
      content: defaultLandingContent,
      isDefault: true,
      updatedAt: null,
    };
  }
  const overlay = data.content as unknown;
  const merged = mergeOverlay(defaultLandingContent, overlay);
  const isDefault =
    !overlay ||
    (typeof overlay === "object" &&
      !Array.isArray(overlay) &&
      Object.keys(overlay as Record<string, unknown>).length === 0);
  return {
    content: merged,
    isDefault,
    updatedAt: data.updated_at,
  };
}
