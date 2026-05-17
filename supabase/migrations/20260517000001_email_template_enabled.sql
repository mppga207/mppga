-- Per-template enable/disable for the automated email send paths.
--
-- The admin Emails tab now surfaces a toggle for each automated
-- template (welcome, renewal-reminder, dunning, event-confirmation,
-- waitlist-confirmation, waitlist-promoted-payment, event-reminder,
-- registration-cancelled). When a template is disabled, every code
-- path that would normally fire it short-circuits in
-- `lib/email/send.ts` and logs `status='skipped_disabled'` to
-- `email_send_log` instead of calling Resend.
--
-- Default is `true` so existing rows keep their current behaviour
-- after this migration. The protect_system_email_templates trigger
-- already allows updating arbitrary columns on system rows (only
-- key / is_system rewrites are blocked), so no trigger changes are
-- needed.

alter table public.email_templates
  add column if not exists is_enabled boolean not null default true;

-- Extend the email_send_log status enum-by-check to allow the new
-- `skipped_disabled` value alongside the existing sent/failed/bounced.
-- Per data-model.md §1, enums live as text + CHECK; this is the
-- pattern for adding values.
alter table public.email_send_log
  drop constraint if exists email_send_log_status_check;

alter table public.email_send_log
  add constraint email_send_log_status_check
  check (status in ('sent', 'failed', 'bounced', 'skipped_disabled'));
