-- Phase 1, Track 4: admin-editable email templates.
--
-- email-automation.md §5 originally placed templates in Resend itself,
-- but the board needs to add new templates (announcements, ad-hoc
-- newsletters, etc.) without touching Resend. We keep the source of
-- truth in Postgres and pass rendered subject/html/text straight to
-- Resend's send API — no Resend-side template references.
--
-- The 10 spec-required templates are seeded with `is_system = true`.
-- System rows cannot be deleted, and their `key` cannot change (call
-- sites in code reference these strings). Subject and body copy ARE
-- editable on system rows so the board can tune wording without a
-- code change. Custom templates are inserted with `is_system = false`
-- and can be created / renamed / deleted freely.
--
-- 11th template `renewal-receipt` resolves the open decision in
-- phase-1-buildout.md §3 #4: the spec leaves this open, and the client
-- chose a dedicated template over reusing `welcome` so the renewal
-- copy can speak to existing members.

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subject text not null,
  body_html text not null,
  body_text text not null,
  -- Drives the 501(c)(6) disclaimer in the footer
  -- (CLAUDE.md constraint #10, stripe-architecture.md §5.1).
  is_dues_related boolean not null default false,
  -- System templates back automated sends from code. The key is
  -- locked, the row cannot be deleted. Subject + body are editable.
  is_system boolean not null default false,
  description text not null default '',
  -- Admin help: which {{vars}} the template knows about. Display-only;
  -- the renderer substitutes whatever vars are passed in, missing vars
  -- render as empty strings.
  available_variables text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_templates_key_format
    check (key ~ '^[a-z][a-z0-9-]*$')
);

create index email_templates_key_idx on public.email_templates (key);

create trigger set_updated_at_email_templates
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- System-row guards.
-- DELETE on a system row → reject.
-- UPDATE that flips `is_system` off, or rewrites `key`, on a system row
-- → reject. Everything else (subject, body, description, etc.) is fair
-- game so the admin Emails tab can edit copy in place.
-- ---------------------------------------------------------------------------
create or replace function public.protect_system_email_templates()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    if old.is_system then
      raise exception 'cannot delete system email template "%"', old.key
        using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  if (tg_op = 'UPDATE') then
    if old.is_system then
      if new.key is distinct from old.key then
        raise exception 'cannot rename system email template "%"', old.key
          using errcode = 'restrict_violation';
      end if;
      if new.is_system = false then
        raise exception
          'cannot demote system email template "%" to non-system', old.key
          using errcode = 'restrict_violation';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger protect_system_email_templates_update
  before update on public.email_templates
  for each row execute function public.protect_system_email_templates();

create trigger protect_system_email_templates_delete
  before delete on public.email_templates
  for each row execute function public.protect_system_email_templates();

-- ---------------------------------------------------------------------------
-- RLS — admin reads + writes; the renderer (service role) reads.
-- Custom (non-system) rows can be inserted/deleted by admin.
-- ---------------------------------------------------------------------------
alter table public.email_templates enable row level security;

create policy email_templates_admin_select on public.email_templates
  for select
  to authenticated
  using (public.is_admin());

create policy email_templates_admin_insert on public.email_templates
  for insert
  to authenticated
  with check (public.is_admin() and is_system = false);

create policy email_templates_admin_update on public.email_templates
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy email_templates_admin_delete on public.email_templates
  for delete
  to authenticated
  using (public.is_admin() and is_system = false);

-- ---------------------------------------------------------------------------
-- Seed: the 10 spec templates + renewal-receipt.
--
-- Body copy follows brand.md §5 — warm, plain language, sentence case,
-- no exclamation points in functional UI (one is allowed in the
-- welcome subject as a celebratory moment per brand.md §5). Dues
-- receipts carry the 501(c)(6) disclaimer in the footer; the renderer
-- appends it based on `is_dues_related`, never duplicated in body.
--
-- Footer (org name, contact, unsubscribe, conditional disclaimer) is
-- assembled by lib/email/render.ts at send time so a change to the
-- contact email in site_settings propagates everywhere without an
-- email_templates edit.
-- ---------------------------------------------------------------------------
insert into public.email_templates (
  key, name, subject, body_html, body_text,
  is_dues_related, is_system, description, available_variables
) values
  (
    'welcome',
    'Welcome — first payment received',
    'Welcome to the Maine Professional Pet Groomers Association!',
    '<p>Hi {{full_name}},</p>'
    '<p>Your membership is now active. Thanks for joining the Maine Professional Pet Groomers Association — we''re glad to have you.</p>'
    '<p>You can access your member portal here:</p>'
    '<p><a href="{{site_url}}/dashboard">{{site_url}}/dashboard</a></p>'
    '<p>From your dashboard you can update your directory listing, manage your billing, and register for upcoming events.</p>'
    '<p>If anything looks off, reply to this email and a board member will follow up.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'Your membership is now active. Thanks for joining the Maine Professional Pet Groomers Association — we''re glad to have you.' || E'\n\n' ||
    'You can access your member portal here:' || E'\n' ||
    '{{site_url}}/dashboard' || E'\n\n' ||
    'From your dashboard you can update your directory listing, manage your billing, and register for upcoming events.' || E'\n\n' ||
    'If anything looks off, reply to this email and a board member will follow up.',
    true, true,
    'Fires once per member, on the first successful dues payment.',
    array['full_name', 'site_url', 'tier_name', 'amount_paid']
  ),
  (
    'renewal-receipt',
    'Renewal receipt',
    'Your MPPGA membership has been renewed',
    '<p>Hi {{full_name}},</p>'
    '<p>Your {{tier_name}} membership renewed today. Thanks for staying with the Maine Professional Pet Groomers Association.</p>'
    '<p>Amount charged: {{amount_paid}}</p>'
    '<p>Your membership is now valid through {{expires_at}}.</p>'
    '<p>You can review your invoice history any time from <a href="{{site_url}}/dashboard/billing">your billing page</a>.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'Your {{tier_name}} membership renewed today. Thanks for staying with the Maine Professional Pet Groomers Association.' || E'\n\n' ||
    'Amount charged: {{amount_paid}}' || E'\n' ||
    'Valid through: {{expires_at}}' || E'\n\n' ||
    'Review your invoice history any time at {{site_url}}/dashboard/billing.',
    true, true,
    'Fires on every successful renewal payment after the first.',
    array['full_name', 'tier_name', 'amount_paid', 'expires_at', 'site_url']
  ),
  (
    'renewal-reminder',
    'Renewal reminder',
    'Your MPPGA membership renews in {{days_remaining}} days',
    '<p>Hi {{full_name}},</p>'
    '<p>This is a heads-up that your {{tier_name}} membership is set to renew in {{days_remaining}} days, on {{expires_at}}.</p>'
    '<p>You don''t need to do anything — your card on file will be charged automatically. If you need to update your payment method, you can do that from <a href="{{site_url}}/dashboard/billing">your billing page</a>.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'This is a heads-up that your {{tier_name}} membership is set to renew in {{days_remaining}} days, on {{expires_at}}.' || E'\n\n' ||
    'You don''t need to do anything — your card on file will be charged automatically. If you need to update your payment method, you can do that at {{site_url}}/dashboard/billing.',
    true, true,
    'Cron sends this on the day offsets configured in email_settings.renewal_reminder_days_before (default 30/7/1 days before expires_at).',
    array['full_name', 'tier_name', 'days_remaining', 'expires_at', 'site_url']
  ),
  (
    'dunning',
    'Payment failed',
    'We couldn''t process your MPPGA dues payment',
    '<p>Hi {{full_name}},</p>'
    '<p>We weren''t able to charge your card on file for your MPPGA dues. Your membership will stay active for now, but we''ll need you to update your payment method to keep it that way.</p>'
    '<p><a href="{{customer_portal_url}}">Update your card</a></p>'
    '<p>If you''ve already updated your card, you can ignore this email — the next attempt will go through automatically.</p>'
    '<p>Questions? Reply to this email and a board member will help.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'We weren''t able to charge your card on file for your MPPGA dues. Your membership will stay active for now, but we''ll need you to update your payment method to keep it that way.' || E'\n\n' ||
    'Update your card: {{customer_portal_url}}' || E'\n\n' ||
    'If you''ve already updated your card, you can ignore this email — the next attempt will go through automatically.' || E'\n\n' ||
    'Questions? Reply to this email and a board member will help.',
    true, true,
    'Fires immediately on Stripe invoice.payment_failed and re-fires on the schedule in email_settings.dunning_retry_days.',
    array['full_name', 'customer_portal_url', 'amount_due', 'site_url']
  ),
  (
    'event-confirmation',
    'Event confirmation',
    'You''re registered for {{event_title}}',
    '<p>Hi {{full_name}},</p>'
    '<p>You''re confirmed for <strong>{{event_title}}</strong> on {{event_date}} at {{event_location}}.</p>'
    '<p>Amount paid: {{amount_paid}}</p>'
    '<p>We''ll send a reminder closer to the date. If you need to cancel, reply to this email and a board member will take care of it.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'You''re confirmed for {{event_title}} on {{event_date}} at {{event_location}}.' || E'\n\n' ||
    'Amount paid: {{amount_paid}}' || E'\n\n' ||
    'We''ll send a reminder closer to the date. If you need to cancel, reply to this email and a board member will take care of it.',
    false, true,
    'Fires when an event registration moves to payment_status = paid or free.',
    array['full_name', 'event_title', 'event_date', 'event_location', 'amount_paid', 'site_url']
  ),
  (
    'waitlist-confirmation',
    'Waitlist confirmation',
    'You''re on the waitlist for {{event_title}}',
    '<p>Hi {{full_name}},</p>'
    '<p>{{event_title}} is at capacity, so you''re on the waitlist at position {{waitlist_position}}.</p>'
    '<p>If a spot opens up, we''ll email you a link to complete your registration. Until then, no charge to your card.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    '{{event_title}} is at capacity, so you''re on the waitlist at position {{waitlist_position}}.' || E'\n\n' ||
    'If a spot opens up, we''ll email you a link to complete your registration. Until then, no charge to your card.',
    false, true,
    'Fires when a registration is created with status = waitlisted.',
    array['full_name', 'event_title', 'waitlist_position', 'site_url']
  ),
  (
    'waitlist-promoted-payment',
    'Waitlist promoted — payment required',
    'A spot opened up for {{event_title}}',
    '<p>Hi {{full_name}},</p>'
    '<p>Good news — a spot opened up for {{event_title}} on {{event_date}}. To claim it, please complete payment within {{payment_link_expiry_hours}} hours:</p>'
    '<p><a href="{{checkout_url}}">Complete your registration</a></p>'
    '<p>If you don''t complete payment in time, your spot will go to the next person on the waitlist.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'Good news — a spot opened up for {{event_title}} on {{event_date}}. To claim it, please complete payment within {{payment_link_expiry_hours}} hours:' || E'\n\n' ||
    '{{checkout_url}}' || E'\n\n' ||
    'If you don''t complete payment in time, your spot will go to the next person on the waitlist.',
    false, true,
    'Fires when a waitlisted registration is promoted and member_price > 0.',
    array['full_name', 'event_title', 'event_date', 'checkout_url', 'payment_link_expiry_hours', 'site_url']
  ),
  (
    'event-reminder',
    'Event reminder',
    'Reminder: {{event_title}} is coming up',
    '<p>Hi {{full_name}},</p>'
    '<p>This is a reminder that <strong>{{event_title}}</strong> starts on {{event_date}} at {{event_location}}.</p>'
    '<p>See you there.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'This is a reminder that {{event_title}} starts on {{event_date}} at {{event_location}}.' || E'\n\n' ||
    'See you there.',
    false, true,
    'Cron sends this at the hour offsets in email_settings.event_reminder_hours_before (default 48/2 hours before event start).',
    array['full_name', 'event_title', 'event_date', 'event_location', 'site_url']
  ),
  (
    'event-announcement',
    'Event announcement',
    'New MPPGA event: {{event_title}}',
    '<p>Hi {{full_name}},</p>'
    '<p>We''re excited to announce <strong>{{event_title}}</strong> on {{event_date}} at {{event_location}}.</p>'
    '<p>{{event_description}}</p>'
    '<p><a href="{{event_url}}">View details and register</a></p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'We''re excited to announce {{event_title}} on {{event_date}} at {{event_location}}.' || E'\n\n' ||
    '{{event_description}}' || E'\n\n' ||
    'View details and register: {{event_url}}',
    false, true,
    'Manual send from the admin Emails tab. Default recipient set: all active members.',
    array['full_name', 'event_title', 'event_date', 'event_location', 'event_description', 'event_url', 'site_url']
  ),
  (
    'registration-cancelled',
    'Registration cancelled',
    'Your registration for {{event_title}} was cancelled',
    '<p>Hi {{full_name}},</p>'
    '<p>Your registration for {{event_title}} on {{event_date}} has been cancelled by a board member.</p>'
    '<p>{{cancellation_reason}}</p>'
    '<p>If you paid for this event, a refund will appear on your card within a few business days. If you have questions, reply to this email.</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    'Your registration for {{event_title}} on {{event_date}} has been cancelled by a board member.' || E'\n\n' ||
    '{{cancellation_reason}}' || E'\n\n' ||
    'If you paid for this event, a refund will appear on your card within a few business days. If you have questions, reply to this email.',
    false, true,
    'Fires when an admin cancels a confirmed registration.',
    array['full_name', 'event_title', 'event_date', 'cancellation_reason', 'site_url']
  ),
  (
    'general-update',
    'General update',
    '{{subject_override}}',
    '<p>Hi {{full_name}},</p>'
    '<p>{{body}}</p>',
    'Hi {{full_name}},' || E'\n\n' ||
    '{{body}}',
    false, true,
    'Manual send from the admin Emails tab. Admin supplies subject and body at compose time.',
    array['full_name', 'subject_override', 'body', 'site_url']
  )
on conflict (key) do nothing;
