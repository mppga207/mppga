-- Public salon directory backed by two security-definer RPCs. The
-- `organizations` SELECT policy is admin-only by default (data-model.md
-- §5.1), but a "find a Maine salon" browse page is the whole point of
-- the directory, so these functions project a narrowed set of columns
-- publicly. Only salons whose primary contact holds an Active or
-- Honorary membership surface; unclaimed stub orgs (created from the
-- /join salon combobox typeahead when a member hadn't picked one yet)
-- stay hidden until they're claimed by a Salon-tier subscription.
--
-- Address line is intentionally omitted from the projection so a sole
-- prop running a salon out of their home doesn't accidentally publish
-- a residential address. Phone + website are public business info.

create or replace function public.public_salons(
  p_city text default null,
  p_limit integer default 200
)
returns table (
  id uuid,
  name text,
  city text,
  state text,
  phone text,
  website text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.city, o.state, o.phone, o.website
  from public.organizations o
  inner join public.memberships m
    on m.profile_id = o.primary_contact_profile_id
  where o.primary_contact_profile_id is not null
    and m.status in ('Active', 'Honorary')
    and (
      p_city is null
      or length(trim(p_city)) = 0
      or lower(o.city) = lower(trim(p_city))
    )
  order by o.name asc
  limit greatest(1, least(coalesce(p_limit, 200), 500))
$$;

create or replace function public.public_salon_cities()
returns table (city text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct o.city
  from public.organizations o
  inner join public.memberships m
    on m.profile_id = o.primary_contact_profile_id
  where o.primary_contact_profile_id is not null
    and m.status in ('Active', 'Honorary')
    and o.city is not null
    and length(trim(o.city)) > 0
  order by 1
$$;

revoke all on function public.public_salons(text, integer) from public;
grant execute on function public.public_salons(text, integer)
  to anon, authenticated;

revoke all on function public.public_salon_cities() from public;
grant execute on function public.public_salon_cities()
  to anon, authenticated;
