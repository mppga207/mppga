/**
 * Supabase database types.
 *
 * Handwritten to mirror the Phase 1 migrations under
 * `supabase/migrations/`. Once a Supabase project is wired up locally,
 * regenerate with:
 *
 *   pnpm supabase gen types typescript --local > types/database.ts
 *
 * and replace this file. Keep the public-schema shape stable across the
 * swap so the typed clients in `lib/supabase/*` don't need to change.
 */

export type ProfileRole = "member" | "admin";

export type MembershipStatus =
  | "Awaiting_Payment"
  | "Active"
  | "Grace_Period"
  | "Lapsed"
  | "Suspended"
  | "Honorary";

export type BillingStatus =
  | "current"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "trialing";

export type EventStatus = "draft" | "published";

export type EventPricingTier = "member" | "guest";

export type EventLapsedPricing = "member" | "guest";

export type EventPaymentStatus = "pending" | "paid" | "refunded" | "free";

export type EventRegistrationStatus = "confirmed" | "waitlisted" | "cancelled";

export type CeCreditStatus = "Pending" | "Approved";

export type AdminAction =
  | "status_override"
  | "email_resend"
  | "profile_edit"
  | "csv_export"
  | "tier_change"
  | "template_edit"
  | "setting_change";

export type EmailSendStatus =
  | "sent"
  | "failed"
  | "bounced"
  | "skipped_disabled";

export type EmailTriggerType = "automated" | "manual" | "webhook";

type Timestamp = string;
type DateOnly = string;
type UUID = string;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type OrganizationsRow = {
  id: UUID;
  name: string;
  primary_contact_profile_id: UUID | null;
  stripe_customer_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type TiersRow = {
  id: UUID;
  name: string;
  slug: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  annual_dues_cents: number;
  voting_rights: boolean;
  directory_listing: boolean;
  corporate_umbrella: boolean;
  display_order: number;
  description: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type ProfilesRow = {
  id: UUID;
  full_name: string;
  email: string;
  phone: string | null;
  role: ProfileRole;
  organization_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type MembershipsRow = {
  id: UUID;
  profile_id: UUID;
  tier_id: UUID;
  status: MembershipStatus;
  billing_status: BillingStatus | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  expires_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type DirectoryListingsRow = {
  id: UUID;
  profile_id: UUID;
  display_name: string;
  bio: string | null;
  city: string;
  state: string;
  address_line: string | null;
  /** PostGIS geography(Point, 4326) — opaque to the client. */
  location: unknown;
  business_phone: string | null;
  personal_mobile: string | null;
  public_email: string | null;
  specialties: string[];
  show_business_phone: boolean;
  show_personal_mobile: boolean;
  show_address: boolean;
  show_public_email: boolean;
  is_visible: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type CertificationsRow = {
  id: UUID;
  profile_id: UUID;
  name: string;
  issuer: string;
  issued_at: DateOnly;
  expires_at: DateOnly | null;
  document_path: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type EventsRow = {
  id: UUID;
  title: string;
  description: string | null;
  date: Timestamp;
  end_date: Timestamp | null;
  location: string;
  member_price: number;
  guest_price: number;
  capacity: number;
  waitlist_enabled: boolean;
  lapsed_member_pricing: EventLapsedPricing;
  status: EventStatus;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type CeCreditsRow = {
  id: UUID;
  profile_id: UUID;
  hours: number;
  source: string;
  event_id: UUID | null;
  document_path: string | null;
  status: CeCreditStatus;
  submitted_at: Timestamp;
  approved_at: Timestamp | null;
  approved_by_profile_id: UUID | null;
}

type EventRegistrationsRow = {
  id: UUID;
  event_id: UUID;
  profile_id: UUID;
  price_paid: number;
  pricing_tier: EventPricingTier;
  payment_status: EventPaymentStatus;
  stripe_checkout_session_id: string | null;
  waitlist_position: number | null;
  status: EventRegistrationStatus;
  registered_at: Timestamp;
}

type ComplianceLogsRow = {
  id: UUID;
  profile_id: UUID;
  document_version: string;
  document_hash: string;
  signed_at: Timestamp;
  ip_address: string;
  user_agent: string;
}

type EmailSettingsRow = {
  id: UUID;
  renewal_reminder_days_before: number[];
  event_reminder_hours_before: number[];
  waitlist_payment_link_expiry_hours: number;
  dunning_retry_days: number[];
  updated_at: Timestamp;
}

type EmailSendLogRow = {
  id: UUID;
  profile_id: UUID | null;
  template: string;
  trigger_type: EmailTriggerType;
  reference_id: UUID | null;
  resend_message_id: string | null;
  status: EmailSendStatus;
  sent_at: Timestamp;
}

type AdminActionLogRow = {
  id: UUID;
  actor_profile_id: UUID;
  subject_profile_id: UUID | null;
  action: AdminAction;
  payload: JsonValue;
  created_at: Timestamp;
}

type DonationsRow = {
  id: UUID;
  profile_id: UUID | null;
  amount_cents: number;
  recurring: boolean;
  stripe_payment_intent_id: string | null;
  message: string | null;
  created_at: Timestamp;
}

type SiteSettingsRow = {
  id: UUID;
  contact_email: string;
  contact_phone: string | null;
  logo_path: string | null;
  signup_skip_payment: boolean;
  updated_at: Timestamp;
}

type SiteContentRow = {
  id: UUID;
  content: JsonValue;
  updated_at: Timestamp;
}

export type ContactTopic =
  | "membership"
  | "events"
  | "sponsorship"
  | "press"
  | "other";

type ContactSubmissionsRow = {
  id: UUID;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  user_agent: string | null;
  ip_address: string | null;
  read_at: Timestamp | null;
  archived_at: Timestamp | null;
  created_at: Timestamp;
}

type EmailTemplatesRow = {
  id: UUID;
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
  created_at: Timestamp;
  updated_at: Timestamp;
}

type TableSpec<Row, RequiredOnInsert extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Required<Pick<Row, RequiredOnInsert>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: TableSpec<OrganizationsRow, "name">;
      tiers: TableSpec<TiersRow, "name" | "slug">;
      profiles: TableSpec<ProfilesRow, "id">;
      memberships: TableSpec<MembershipsRow, "profile_id" | "tier_id">;
      directory_listings: TableSpec<
        DirectoryListingsRow,
        "profile_id" | "location"
      >;
      certifications: TableSpec<
        CertificationsRow,
        "profile_id" | "name" | "issuer" | "issued_at"
      >;
      events: TableSpec<EventsRow, "title" | "date" | "capacity">;
      ce_credits: TableSpec<CeCreditsRow, "profile_id" | "hours">;
      event_registrations: TableSpec<
        EventRegistrationsRow,
        "event_id" | "profile_id" | "pricing_tier"
      >;
      compliance_logs: TableSpec<
        ComplianceLogsRow,
        "profile_id" | "document_version" | "document_hash" | "ip_address"
      >;
      email_settings: TableSpec<EmailSettingsRow, never>;
      email_send_log: TableSpec<EmailSendLogRow, "template" | "trigger_type">;
      admin_action_log: TableSpec<
        AdminActionLogRow,
        "actor_profile_id" | "action"
      >;
      donations: TableSpec<DonationsRow, "amount_cents">;
      site_settings: TableSpec<SiteSettingsRow, never>;
      email_templates: TableSpec<
        EmailTemplatesRow,
        "key" | "name" | "subject" | "body_html" | "body_text"
      >;
      site_content: TableSpec<SiteContentRow, never>;
      contact_submissions: TableSpec<
        ContactSubmissionsRow,
        "name" | "email" | "topic" | "message"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      handle_auth_jwt_claims: {
        Args: { event: JsonValue };
        Returns: JsonValue;
      };
      reserve_event_spot: {
        Args: {
          p_event_id: UUID;
          p_profile_id: UUID;
          p_pricing_tier: EventPricingTier;
          p_price_cents: number;
          p_payment_status?: EventPaymentStatus;
        };
        Returns: EventRegistrationsRow;
      };
      promote_next_waitlisted: {
        Args: { p_event_id: UUID };
        Returns: EventRegistrationsRow | null;
      };
      expire_stale_pending_registrations: {
        Args: { p_expiry_hours: number };
        Returns: { registration_id: UUID; event_id: UUID }[];
      };
      get_landing_stats: {
        Args: Record<string, never>;
        Returns: JsonValue;
      };
    };
    Enums: Record<string, never>;
  };
};
