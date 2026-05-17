import { createClient } from "@/lib/supabase/server";
import type {
  EmailSendStatus,
  EmailTriggerType,
} from "@/types/database";

interface EmailTemplatesRow {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_dues_related: boolean;
  is_system: boolean;
  is_enabled: boolean;
  description: string;
  available_variables: string[];
  created_at: string;
  updated_at: string;
}

interface EmailSettingsRow {
  id: string;
  renewal_reminder_days_before: number[];
  event_reminder_hours_before: number[];
  waitlist_payment_link_expiry_hours: number;
  dunning_retry_days: number[];
  updated_at: string;
}

export interface AdminEmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isDuesRelated: boolean;
  isSystem: boolean;
  isEnabled: boolean;
  description: string;
  availableVariables: string[];
  updatedAt: string;
}

const TEMPLATE_SELECT =
  "id, key, name, subject, body_html, body_text, is_dues_related, is_system, is_enabled, description, available_variables, updated_at";

function toTemplate(row: EmailTemplatesRow): AdminEmailTemplate {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    isDuesRelated: row.is_dues_related,
    isSystem: row.is_system,
    isEnabled: row.is_enabled,
    description: row.description,
    availableVariables: row.available_variables,
    updatedAt: row.updated_at,
  };
}

export async function loadEmailTemplates(): Promise<AdminEmailTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select(TEMPLATE_SELECT)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })
    .returns<EmailTemplatesRow[]>();
  return (data ?? []).map(toTemplate);
}

export async function loadEmailTemplateByKey(
  key: string,
): Promise<AdminEmailTemplate | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select(TEMPLATE_SELECT)
    .eq("key", key)
    .maybeSingle<EmailTemplatesRow>();
  return data ? toTemplate(data) : null;
}

/**
 * Each automated email shipping in the system. The key matches a row
 * in `email_templates` (system row) so the admin can pair the
 * scheduling intent with the editable copy. Ordered for the Emails
 * tab's status panel.
 */
export interface AutomatedEmailMeta {
  key: string;
  label: string;
  summary: string;
  cadence: string;
}

export const AUTOMATED_EMAILS: readonly AutomatedEmailMeta[] = [
  {
    key: "welcome",
    label: "Welcome",
    summary: "New members, right after their first dues payment.",
    cadence: "Once per member, immediately on activation.",
  },
  {
    key: "renewal-receipt",
    label: "Renewal receipt",
    summary: "Confirms a successful annual renewal payment.",
    cadence: "Once per renewal, immediately after the invoice clears.",
  },
  {
    key: "renewal-reminder",
    label: "Renewal reminder",
    summary: "Heads-up to active members before their dues run out.",
    cadence: "Sent on each offset configured in “Renewal reminders” above.",
  },
  {
    key: "dunning",
    label: "Failed payment follow-up",
    summary: "Asks a member to update their card after a missed charge.",
    cadence: "On failure, then on each follow-up day configured above.",
  },
  {
    key: "event-confirmation",
    label: "Event confirmation",
    summary: "Confirms a paid or free event registration.",
    cadence: "Immediately after the registration is confirmed.",
  },
  {
    key: "waitlist-confirmation",
    label: "Waitlist confirmation",
    summary: "Tells a registrant they’re on the waitlist.",
    cadence: "Immediately when they’re added to the list.",
  },
  {
    key: "waitlist-promoted-payment",
    label: "Waitlist promotion",
    summary: "Lets a waitlisted attendee know a spot opened up.",
    cadence: "Immediately when their spot becomes available.",
  },
  {
    key: "event-reminder",
    label: "Event reminder",
    summary: "Reminds confirmed attendees that an event is coming up.",
    cadence: "Sent on each offset configured in “Event reminders” above.",
  },
  {
    key: "registration-cancelled",
    label: "Registration cancelled",
    summary: "Notifies a member their registration was cancelled.",
    cadence: "Immediately when an admin cancels their registration.",
  },
];

export interface AdminEmailSettings {
  renewalReminderDaysBefore: number[];
  eventReminderHoursBefore: number[];
  waitlistPaymentLinkExpiryHours: number;
  dunningRetryDays: number[];
  updatedAt: string;
}

export async function loadEmailSettings(): Promise<AdminEmailSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_settings")
    .select(
      "renewal_reminder_days_before, event_reminder_hours_before, waitlist_payment_link_expiry_hours, dunning_retry_days, updated_at",
    )
    .limit(1)
    .maybeSingle<EmailSettingsRow>();
  if (!data) return null;
  return {
    renewalReminderDaysBefore: data.renewal_reminder_days_before,
    eventReminderHoursBefore: data.event_reminder_hours_before,
    waitlistPaymentLinkExpiryHours: data.waitlist_payment_link_expiry_hours,
    dunningRetryDays: data.dunning_retry_days,
    updatedAt: data.updated_at,
  };
}

export interface AdminEmailLogEntry {
  id: string;
  profileId: string | null;
  profileName: string | null;
  profileEmail: string | null;
  template: string;
  triggerType: EmailTriggerType;
  status: EmailSendStatus;
  resendMessageId: string | null;
  referenceId: string | null;
  sentAt: string;
}

export interface BroadcastAudienceCounts {
  active: number;
  allMembers: number;
}

/**
 * Counts the audience options surfaced in the broadcast composer.
 * Active = Active + Honorary + Grace_Period (every member who can
 * still receive value from MPPGA). All members = every profile,
 * including Lapsed / Suspended / Awaiting_Payment, for board-wide
 * communications.
 */
export async function loadBroadcastAudienceCounts(): Promise<BroadcastAudienceCounts> {
  const supabase = await createClient();
  const { count: allMembers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const { count: active } = await supabase
    .from("memberships")
    .select("profile_id", { count: "exact", head: true })
    .in("status", ["Active", "Honorary", "Grace_Period"]);
  return {
    active: active ?? 0,
    allMembers: allMembers ?? 0,
  };
}

export async function loadRecentEmailSends(
  limit = 100,
): Promise<AdminEmailLogEntry[]> {
  const supabase = await createClient();
  interface JoinRow {
    id: string;
    profile_id: string | null;
    template: string;
    trigger_type: EmailTriggerType;
    status: EmailSendStatus;
    resend_message_id: string | null;
    reference_id: string | null;
    sent_at: string;
    profiles: { full_name: string | null; email: string } | null;
  }
  const { data } = await supabase
    .from("email_send_log")
    .select(
      "id, profile_id, template, trigger_type, status, resend_message_id, reference_id, sent_at, profiles(full_name, email)",
    )
    .order("sent_at", { ascending: false })
    .limit(limit)
    .returns<JoinRow[]>();
  return (data ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    profileName: row.profiles?.full_name ?? null,
    profileEmail: row.profiles?.email ?? null,
    template: row.template,
    triggerType: row.trigger_type,
    status: row.status,
    resendMessageId: row.resend_message_id,
    referenceId: row.reference_id,
    sentAt: row.sent_at,
  }));
}
