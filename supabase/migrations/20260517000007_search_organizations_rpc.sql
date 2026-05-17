-- Public typeahead lookup for the salon combobox on /join. The
-- `organizations` SELECT policy (rls_policies §organizations) only
-- exposes rows to admins or members of the org, which is correct for
-- the table but blocks the unauthenticated visitor signing up. The
-- typeahead needs to surface salon names without leaking the rest of
-- the row (Stripe customer id, primary contact, timestamps), so this
-- function projects only (id, name) and runs as security definer.
--
-- The signup flow stashes the chosen id in user_metadata.salon_id; the
-- auth callback links the new profile to that organization. When the
-- visitor doesn't pick an existing match, the server action creates a
-- new org from the free-text name (primary_contact_profile_id stays
-- null until a Salon-tier subscription claims it).

create or replace function public.search_organizations(
  p_query text,
  p_limit integer default 8
)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name
  from public.organizations o
  where length(trim(p_query)) >= 2
    and o.name ilike '%' || trim(p_query) || '%'
  order by
    -- Prefix matches first so "smith" surfaces "Smith Grooming" above
    -- "Bob's Smith Salon".
    case when o.name ilike trim(p_query) || '%' then 0 else 1 end,
    o.name asc
  limit greatest(1, least(coalesce(p_limit, 8), 20))
$$;

revoke all on function public.search_organizations(text, integer) from public;
grant execute on function public.search_organizations(text, integer)
  to anon, authenticated;
