import { createClient } from "@/lib/supabase/server";

export interface SiteContact {
  contactEmail: string;
  contactPhone: string | null;
  updatedAt: string;
}

export async function loadSiteContact(): Promise<SiteContact | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("contact_email, contact_phone, updated_at")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    updatedAt: data.updated_at,
  };
}

export async function loadSignupSkipPayment(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("signup_skip_payment")
    .limit(1)
    .maybeSingle();
  return data?.signup_skip_payment === true;
}

export interface BoardMember {
  profileId: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export async function loadBoardRoster(): Promise<BoardMember[]> {
  const supabase = await createClient();
  interface Row {
    id: string;
    full_name: string | null;
    email: string;
    created_at: string;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "admin")
    .order("full_name", { ascending: true })
    .returns<Row[]>();
  return (data ?? []).map((row) => ({
    profileId: row.id,
    fullName: row.full_name ?? row.email,
    email: row.email,
    createdAt: row.created_at,
  }));
}

export interface MemberCandidate {
  profileId: string;
  fullName: string;
  email: string;
}

export async function searchMemberCandidates(
  query: string,
): Promise<MemberCandidate[]> {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const term = `%${query.trim().replace(/[%_]/g, "\\$&")}%`;
  interface Row {
    id: string;
    full_name: string | null;
    email: string;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "member")
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .limit(10)
    .returns<Row[]>();
  return (data ?? []).map((row) => ({
    profileId: row.id,
    fullName: row.full_name ?? row.email,
    email: row.email,
  }));
}

export interface EthicsSignature {
  id: string;
  profileId: string;
  signerName: string;
  signerEmail: string;
  documentVersion: string;
  documentHash: string;
  signedAt: string;
  ipAddress: string | null;
}

export async function loadEthicsSignatures(
  limit = 200,
): Promise<EthicsSignature[]> {
  const supabase = await createClient();
  interface Row {
    id: string;
    profile_id: string;
    document_version: string;
    document_hash: string;
    signed_at: string;
    ip_address: string | null;
    profiles: { full_name: string | null; email: string } | null;
  }
  const { data } = await supabase
    .from("compliance_logs")
    .select(
      "id, profile_id, document_version, document_hash, signed_at, ip_address, profiles(full_name, email)",
    )
    .order("signed_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return (data ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    signerName: row.profiles?.full_name ?? row.profiles?.email ?? "—",
    signerEmail: row.profiles?.email ?? "",
    documentVersion: row.document_version,
    documentHash: row.document_hash,
    signedAt: row.signed_at,
    ipAddress: row.ip_address,
  }));
}
