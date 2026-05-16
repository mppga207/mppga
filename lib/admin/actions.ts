"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { sendTransactional } from "@/lib/email/send";
import { invokeMembershipStatusSync } from "@/lib/membership/sync";
import { requireAdmin } from "@/lib/supabase/session";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { promoteWaitlist } from "@/lib/events/actions";
import type {
  EventLapsedPricing,
  EventStatus,
  MembershipStatus,
} from "@/types/database";

/**
 * Admin action audit log writer. Service role per data-model.md §5.13
 * — admin_action_log INSERT is blocked for `authenticated`. Every admin
 * mutation in this file goes through here so the audit trail is
 * complete (admin-portal.md §7).
 *
 * No throw on failure: a missing audit entry should not break the user
 * flow it accompanies. Surfaces in server logs for follow-up.
 */
async function logAdminAction(
  actorProfileId: string,
  action:
    | "status_override"
    | "email_resend"
    | "profile_edit"
    | "csv_export"
    | "tier_change"
    | "template_edit"
    | "setting_change",
  subjectProfileId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("admin_action_log").insert({
    actor_profile_id: actorProfileId,
    subject_profile_id: subjectProfileId,
    action,
    payload: JSON.parse(JSON.stringify(payload)),
  });
  if (error) {
    console.error("admin_action_log insert failed", action, error);
  }
}

// =========================================================================
// Member status override
// =========================================================================

export type StatusOverrideResult =
  | { status: "ok" }
  | { status: "error"; reason: string };

export async function overrideMemberStatus(
  profileId: string,
  newStatus: MembershipStatus,
  reason: string,
): Promise<StatusOverrideResult> {
  const session = await requireAdmin();

  // Read the prior status from the JWT-bypassing client so we know what
  // to log. The Edge Function is the only writer (CLAUDE.md
  // constraint #2) — we don't mutate `memberships.status` here.
  const supabase = createServiceRoleClient();
  const { data: prior, error: priorError } = await supabase
    .from("memberships")
    .select("status")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (priorError) {
    return { status: "error", reason: priorError.message };
  }

  const sync = await invokeMembershipStatusSync({
    mode: "single",
    profileId,
    requestedStatus: newStatus,
    reason,
  });
  if (!sync.ok) {
    return {
      status: "error",
      reason: `membership-status-sync returned ${sync.status}`,
    };
  }

  await logAdminAction(session.user.id, "status_override", profileId, {
    from: prior?.status ?? null,
    to: newStatus,
    reason,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/members/${profileId}`);
  return { status: "ok" };
}

export async function overrideStatusAction(formData: FormData): Promise<void> {
  const profileId = String(formData.get("profile_id") ?? "");
  const requested = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const VALID: ReadonlySet<MembershipStatus> = new Set<MembershipStatus>([
    "Awaiting_Payment",
    "Active",
    "Grace_Period",
    "Lapsed",
    "Suspended",
    "Honorary",
  ]);
  if (!profileId || !VALID.has(requested as MembershipStatus)) {
    redirect(`/admin/members/${profileId}?error=invalid_input`);
  }
  const result = await overrideMemberStatus(
    profileId,
    requested as MembershipStatus,
    reason,
  );
  if (result.status !== "ok") {
    redirect(
      `/admin/members/${profileId}?error=${encodeURIComponent(result.reason)}`,
    );
  }
  redirect(`/admin/members/${profileId}?ok=status`);
}

// =========================================================================
// Resend welcome email
// =========================================================================

export async function resendWelcomeEmail(
  profileId: string,
): Promise<{ status: "ok" } | { status: "error"; reason: string }> {
  const session = await requireAdmin();

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) {
    return { status: "error", reason: "profile_not_found" };
  }

  // Admin resends are explicit re-sends; the dedup index is keyed on
  // profile_id + template + reference_id, and we want this to override
  // the once-per-membership lock on the original welcome. A fresh
  // reference_id (timestamp-based) lets it fire as a manual send.
  const referenceId = `admin-resend:${Date.now()}`;
  const result = await sendTransactional({
    template: "welcome",
    to: profile.email,
    triggerType: "manual",
    profileId,
    referenceId,
    vars: {
      full_name: profile.full_name ?? profile.email,
    },
  });

  await logAdminAction(session.user.id, "email_resend", profileId, {
    template: "welcome",
    reference_id: referenceId,
    result: result.status,
  });

  if (result.status === "failed") {
    return { status: "error", reason: result.reason };
  }
  return { status: "ok" };
}

export async function resendWelcomeAction(formData: FormData): Promise<void> {
  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) redirect("/admin");
  const result = await resendWelcomeEmail(profileId);
  if (result.status !== "ok") {
    redirect(
      `/admin/members/${profileId}?error=${encodeURIComponent(result.reason)}`,
    );
  }
  redirect(`/admin/members/${profileId}?ok=welcome_resent`);
}

// =========================================================================
// Event CRUD
// =========================================================================

interface ParsedEventInput {
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string;
  member_price: number;
  guest_price: number;
  capacity: number;
  waitlist_enabled: boolean;
  lapsed_member_pricing: EventLapsedPricing;
  status: EventStatus;
}

function dollarsToCents(raw: FormDataEntryValue | null): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function parseEventForm(formData: FormData): ParsedEventInput | null {
  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0);
  if (!title || !location || !date || !Number.isFinite(capacity) || capacity < 1) {
    return null;
  }

  const endDateRaw = String(formData.get("end_date") ?? "").trim();
  const memberPrice = dollarsToCents(formData.get("member_price"));
  const guestPrice = dollarsToCents(formData.get("guest_price"));
  if (guestPrice < memberPrice) return null;

  const lapsed = String(formData.get("lapsed_member_pricing") ?? "guest");
  const lapsedPricing: EventLapsedPricing =
    lapsed === "member" ? "member" : "guest";
  const status: EventStatus =
    String(formData.get("status") ?? "draft") === "published"
      ? "published"
      : "draft";

  return {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    date: new Date(date).toISOString(),
    end_date: endDateRaw ? new Date(endDateRaw).toISOString() : null,
    location,
    member_price: memberPrice,
    guest_price: guestPrice,
    capacity: Math.round(capacity),
    waitlist_enabled: formData.get("waitlist_enabled") != null,
    lapsed_member_pricing: lapsedPricing,
    status,
  };
}

export async function createEventAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = parseEventForm(formData);
  if (!parsed) {
    redirect("/admin/events/new?error=invalid_input");
  }

  // Events INSERT is admin-RLS-permitted (data-model.md §5.9), but we use
  // the service-role client for one transaction-safe write path across
  // events + admin_action_log.
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed, created_by: session.user.id })
    .select("id")
    .single();
  if (error || !data) {
    redirect(
      `/admin/events/new?error=${encodeURIComponent(error?.message ?? "create_failed")}`,
    );
  }

  await logAdminAction(session.user.id, "profile_edit", null, {
    event_id: data.id,
    action: "create_event",
    title: parsed.title,
    status: parsed.status,
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEventAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const eventId = String(formData.get("event_id") ?? "");
  const parsed = parseEventForm(formData);
  if (!eventId || !parsed) {
    redirect(
      `/admin/events/${eventId}?error=invalid_input`,
    );
  }

  const supabase = createServiceRoleClient();
  const { data: priorRow } = await supabase
    .from("events")
    .select("title, status")
    .eq("id", eventId)
    .maybeSingle();

  const { error } = await supabase
    .from("events")
    .update(parsed)
    .eq("id", eventId);
  if (error) {
    redirect(
      `/admin/events/${eventId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  await logAdminAction(session.user.id, "profile_edit", null, {
    event_id: eventId,
    action: "update_event",
    prior_title: priorRow?.title,
    prior_status: priorRow?.status,
    new_title: parsed.title,
    new_status: parsed.status,
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/admin/events/${eventId}?ok=saved`);
}

export async function cancelRegistrationAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const registrationId = String(formData.get("registration_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!registrationId || !eventId) redirect("/admin/events");

  const supabase = createServiceRoleClient();
  const { data: prior } = await supabase
    .from("event_registrations")
    .select("status, profile_id, event_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (!prior) {
    redirect(`/admin/events/${eventId}/rsvps?error=not_found`);
  }

  const wasConfirmed = prior.status === "confirmed";

  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId);
  if (error) {
    redirect(
      `/admin/events/${eventId}/rsvps?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Notify the member their registration was cancelled (events.md §8).
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", prior.profile_id)
    .maybeSingle();
  const { data: event } = await supabase
    .from("events")
    .select("title, date")
    .eq("id", eventId)
    .maybeSingle();
  if (profile?.email && event) {
    await sendTransactional({
      template: "registration-cancelled",
      to: profile.email,
      triggerType: "manual",
      profileId: prior.profile_id,
      referenceId: `${registrationId}:cancelled-by-admin`,
      vars: {
        full_name: profile.full_name ?? profile.email,
        event_title: event.title,
        event_date: event.date,
        cancellation_reason: "Cancelled by MPPGA staff",
      },
    });
  }

  await logAdminAction(session.user.id, "profile_edit", prior.profile_id, {
    event_id: eventId,
    registration_id: registrationId,
    action: "cancel_registration",
  });

  if (wasConfirmed) {
    await promoteWaitlist(eventId);
  }

  revalidatePath(`/admin/events/${eventId}/rsvps`);
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}/rsvps?ok=cancelled`);
}

// =========================================================================
// CSV export — members
// =========================================================================

export async function exportMembersCsv(): Promise<{ csv: string; filename: string }> {
  const session = await requireAdmin();

  const supabase = await createClient();
  interface ExportRow {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    organizations: { name: string } | null;
    memberships:
      | {
          status: MembershipStatus | null;
          expires_at: string | null;
          billing_status: string | null;
          stripe_customer_id: string | null;
          tiers: { name: string } | null;
        }
      | null;
  }
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, organizations(name), memberships(status, expires_at, billing_status, stripe_customer_id, tiers(name))",
    )
    .order("full_name", { ascending: true })
    .returns<ExportRow[]>();

  const header = [
    "profile_id",
    "full_name",
    "email",
    "role",
    "organization",
    "membership_status",
    "tier",
    "expires_at",
    "billing_status",
    "stripe_customer_id",
  ].join(",");

  const rows = (data ?? []).map((row) => {
    const fields = [
      row.id,
      row.full_name ?? "",
      row.email,
      row.role,
      row.organizations?.name ?? "",
      row.memberships?.status ?? "",
      row.memberships?.tiers?.name ?? "",
      row.memberships?.expires_at ?? "",
      row.memberships?.billing_status ?? "",
      row.memberships?.stripe_customer_id ?? "",
    ];
    return fields.map(csvEscape).join(",");
  });

  await logAdminAction(session.user.id, "csv_export", null, {
    export: "members",
    row_count: rows.length,
  });

  return {
    csv: [header, ...rows].join("\n"),
    filename: `mppga-members-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

function csvEscape(value: string | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
