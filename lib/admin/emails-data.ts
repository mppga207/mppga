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
  description: string;
  availableVariables: string[];
  updatedAt: string;
}

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
    description: row.description,
    availableVariables: row.available_variables,
    updatedAt: row.updated_at,
  };
}

export async function loadEmailTemplates(): Promise<AdminEmailTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select(
      "id, key, name, subject, body_html, body_text, is_dues_related, is_system, description, available_variables, updated_at",
    )
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
    .select(
      "id, key, name, subject, body_html, body_text, is_dues_related, is_system, description, available_variables, updated_at",
    )
    .eq("key", key)
    .maybeSingle<EmailTemplatesRow>();
  return data ? toTemplate(data) : null;
}

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
