-- Phase 1: public landing-page stats RPC.
--
-- The "By the numbers" section on `/` shows three live counts:
--   - members:       memberships with status in ('Active', 'Honorary')
--   - towns served:  distinct case-insensitive city values from visible
--                    directory_listings
--   - events_year:   published events with date in the current calendar year
--
-- Anon callers cannot read `memberships` directly (RLS blocks them — see
-- data-model.md §5.4), so this RPC runs SECURITY DEFINER and returns only
-- aggregate counts. No PII crosses the trust boundary.

create or replace function public.get_landing_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'member_count', (
      select count(*)::int
        from public.memberships
       where status in ('Active', 'Honorary')
    ),
    'town_count', (
      select count(distinct lower(city))::int
        from public.directory_listings
       where is_visible = true
         and city is not null
         and length(trim(city)) > 0
    ),
    'event_count_this_year', (
      select count(*)::int
        from public.events
       where status = 'published'
         and date >= date_trunc('year', now())
         and date <  date_trunc('year', now()) + interval '1 year'
    )
  );
$$;

grant execute on function public.get_landing_stats() to anon, authenticated, service_role;
