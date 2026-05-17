import { cache } from "react";

import { env } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const BUCKET = "branding";

export interface SiteLogo {
  logoPath: string | null;
  logoUrl: string | null;
}

/**
 * Returns the storage path + cached public URL for the org logo, or
 * nulls if the admin hasn't uploaded one yet. The placeholder M chip
 * stays the fallback (see `components/mppga/branding/BrandLogo.tsx`).
 *
 * `loadSiteLogo` is cached per request so the Nav + Footer + email
 * footer don't issue duplicate selects on the same render.
 */
export const loadSiteLogo = cache(async (): Promise<SiteLogo> => {
  // Preview / local-dev path: Supabase isn't configured, so fall back
  // to the placeholder M chip rather than crashing the page that renders
  // <BrandLogo />.
  if (!isSupabaseConfigured()) {
    return { logoPath: null, logoUrl: null };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("logo_path")
    .limit(1)
    .maybeSingle();
  const logoPath = data?.logo_path ?? null;
  if (!logoPath) {
    return { logoPath: null, logoUrl: null };
  }
  return {
    logoPath,
    logoUrl: publicLogoUrl(logoPath),
  };
});

function publicLogoUrl(path: string): string | null {
  const base = env.supabase.url;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}
