-- Persist /contact form submissions so the admin overview can surface
-- them alongside other actionable items (signups awaiting payment,
-- past-due billing, draft events). Previously the form was inert and
-- the page directed visitors to email mppga207@gmail.com directly.
--
-- Insert policy is open to anon + authenticated because the form is
-- public — anyone can drop a note. Admin reads and updates (mark-read,
-- archive) flow through the user-scoped client with the admin JWT
-- claim. No DELETE policy: submissions stay around as an audit trail.

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null
    constraint contact_submissions_topic_check check (
      topic in ('membership', 'events', 'sponsorship', 'press', 'other')
    ),
  message text not null,
  user_agent text,
  ip_address inet,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Unread+un-archived submissions are what the overview surfaces; a
-- partial index keeps that query cheap as the table grows.
create index contact_submissions_unread_idx
  on public.contact_submissions (created_at desc)
  where read_at is null and archived_at is null;

create index contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

alter table public.contact_submissions enable row level security;

create policy contact_submissions_public_insert on public.contact_submissions
  for insert
  to anon, authenticated
  with check (true);

create policy contact_submissions_admin_select on public.contact_submissions
  for select
  to authenticated
  using (public.is_admin());

create policy contact_submissions_admin_update on public.contact_submissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
