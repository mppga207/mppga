"use server";

import { createClient } from "@/lib/supabase/server";

export interface OrganizationMatch {
  id: string;
  name: string;
}

/**
 * Typeahead lookup for the /join salon combobox. Hits the
 * `search_organizations` RPC (anon-callable, security definer) so
 * unauthenticated visitors can resolve salon names without exposing
 * the rest of the organizations row.
 */
export async function searchOrganizations(
  query: string,
): Promise<OrganizationMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_organizations", {
    p_query: trimmed,
    p_limit: 8,
  });
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name }));
}
