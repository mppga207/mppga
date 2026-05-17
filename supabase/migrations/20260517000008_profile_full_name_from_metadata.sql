-- Fix: full_name from signup metadata never reached the profile.
--
-- Background: the join form stashes the member's name in
-- options.data.full_name during supabase.auth.signUp. The trigger
-- create_profile_on_signup ran AFTER INSERT on auth.users and inserted
-- the profile, but it only copied email + role — the metadata
-- (full_name, tier_slug, salon_id, salon_new_name) never made it
-- across. New signups landed on /dashboard with an empty name.
--
-- The fix: read full_name from raw_user_meta_data on the trigger so
-- the profile row is correct from the moment it's created. The auth
-- callback still owns tier_slug + salon resolution (those drive
-- membership creation, not the profile shape).
--
-- Backfill: existing rows with full_name='' that have a matching
-- raw_user_meta_data->>'full_name' get patched in this migration so
-- the production users who hit the bug aren't stranded with blank
-- names.

create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    'member',
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles p
set full_name = coalesce(
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  p.full_name
)
from auth.users u
where u.id = p.id
  and (p.full_name = '' or p.full_name is null)
  and nullif(trim(u.raw_user_meta_data->>'full_name'), '') is not null;
