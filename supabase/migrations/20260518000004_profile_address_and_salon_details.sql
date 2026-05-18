-- Profile + organization expansion for the "more on the profile page,
-- mirror on join" change. Adds:
--   profiles.first_name, profiles.last_name (split from full_name; the
--     legacy full_name column stays as the canonical display name and is
--     kept in sync by the application layer on every write)
--   profiles.address_line, profiles.city, profiles.zip, profiles.state
--     (the member's contact address, state defaults to 'ME')
--   organizations.address_line, organizations.city, organizations.zip,
--     organizations.state, organizations.phone, organizations.website
--     (so the salon-owner flow on the profile page and Join form has
--     somewhere to land the salon details)
--
-- Also:
--   - Backfills first_name / last_name from any existing full_name by
--     splitting on the first space.
--   - Updates create_profile_on_signup to copy first_name + last_name
--     out of raw_user_meta_data when present, alongside the existing
--     full_name copy.
--   - Adds an RLS policy so a salon owner (the row's
--     primary_contact_profile_id) can update their own organization
--     row. Without it the existing policy is admin-only and the
--     dashboard salon-info edit would 403.

alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists zip text,
  add column if not exists state text not null default 'ME';

alter table public.organizations
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists zip text,
  add column if not exists state text not null default 'ME',
  add column if not exists phone text,
  add column if not exists website text;

update public.profiles
set
  first_name = case
    when position(' ' in trim(full_name)) > 0
      then split_part(trim(full_name), ' ', 1)
    else trim(full_name)
  end,
  last_name = case
    when position(' ' in trim(full_name)) > 0
      then trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1))
    else ''
  end
where (first_name = '' or first_name is null)
  and full_name is not null
  and trim(full_name) <> '';

create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  meta_first_name text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  meta_last_name text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  resolved_full_name text;
  resolved_first_name text;
  resolved_last_name text;
begin
  resolved_full_name := coalesce(
    meta_full_name,
    nullif(trim(concat_ws(' ', meta_first_name, meta_last_name)), ''),
    ''
  );
  resolved_first_name := coalesce(
    meta_first_name,
    case
      when meta_full_name is not null and position(' ' in meta_full_name) > 0
        then split_part(meta_full_name, ' ', 1)
      else meta_full_name
    end,
    ''
  );
  resolved_last_name := coalesce(
    meta_last_name,
    case
      when meta_full_name is not null and position(' ' in meta_full_name) > 0
        then trim(substring(meta_full_name from position(' ' in meta_full_name) + 1))
      else ''
    end,
    ''
  );

  insert into public.profiles (id, email, role, full_name, first_name, last_name)
  values (
    new.id,
    new.email,
    'member',
    resolved_full_name,
    resolved_first_name,
    resolved_last_name
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- A salon owner needs to be able to edit their own organization row from
-- the dashboard. The existing organizations_admin_write policy is
-- admin-only; this adds the owner case without widening admin reach.
drop policy if exists organizations_owner_update on public.organizations;
create policy organizations_owner_update on public.organizations
  for update
  to authenticated
  using (auth.uid() = primary_contact_profile_id)
  with check (auth.uid() = primary_contact_profile_id);
