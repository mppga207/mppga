-- Phase 1, Track 7: event ticketing — atomic capacity check + waitlist
-- promotion via SECURITY DEFINER functions.
--
-- `event_registrations` INSERT is service-role-only by RLS
-- (`data-model.md` §5.10) — the unique partial index on
-- `(event_id, profile_id) WHERE status != 'cancelled'` (`data-model.md`
-- §6) prevents the same member double-registering. But "is there a slot
-- left?" can't be answered from a single index — it's a COUNT against
-- the current confirmed set. To make capacity safe against concurrent
-- registrations we lock the parent `events` row and decide inside the
-- transaction.
--
-- These helpers run with the writer's privileges (SECURITY DEFINER) but
-- callers are still expected to be the service-role client — server
-- actions in `lib/events/actions.ts` validate the requesting profile
-- before invoking. The functions also re-check basic invariants
-- (member belongs to the right profile, event exists + is published).

set search_path = public;

-- ---------------------------------------------------------------------------
-- reserve_event_spot:
--   Atomically reserves a slot for the given profile on the given event.
--   Returns the new registration row. Status is `confirmed` if capacity
--   allows, `waitlisted` if the event is full and waitlist is enabled.
--   Raises when the event is full and waitlist is disabled.
--
--   Pricing is passed in by the caller (resolved server-side per
--   `events.md` §4) — this function does not consult `tiers` or
--   `memberships`, so the same RPC works for member, guest, and lapsed
--   paths.
-- ---------------------------------------------------------------------------
-- Param types: `event_pricing_tier`, `event_payment_status`, and
-- `event_registration_status` aren't Postgres ENUMs in this schema —
-- per data-model.md §2 they're TEXT columns with CHECK constraints.
-- The function takes plain `text` and validates against the allowed
-- value sets; the CHECK constraints on the target columns are the
-- final safety net for any value that slips through.
create or replace function public.reserve_event_spot(
  p_event_id uuid,
  p_profile_id uuid,
  p_pricing_tier text,
  p_price_cents integer,
  p_payment_status text default 'pending'
)
returns event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
  v_confirmed_count integer;
  v_new_position integer;
  v_status text;
  v_registration event_registrations;
begin
  if p_price_cents < 0 then
    raise exception 'price_cents must be non-negative'
      using errcode = 'check_violation';
  end if;
  if p_pricing_tier not in ('member', 'guest') then
    raise exception 'invalid pricing_tier: %', p_pricing_tier
      using errcode = 'check_violation';
  end if;
  if p_payment_status not in ('pending', 'paid', 'refunded', 'free') then
    raise exception 'invalid payment_status: %', p_payment_status
      using errcode = 'check_violation';
  end if;

  -- Lock the parent row for the duration of the transaction. Concurrent
  -- reservations on the same event serialize on this lock so the count
  -- below is consistent with the insert that follows.
  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event % not found', p_event_id
      using errcode = 'no_data_found';
  end if;

  if v_event.status <> 'published' then
    raise exception 'event % is not published', p_event_id
      using errcode = 'check_violation';
  end if;

  -- One active registration per (event, profile) — the partial unique
  -- index enforces this, but we surface a clean error rather than
  -- bubble the unique violation up.
  if exists (
    select 1 from event_registrations
    where event_id = p_event_id
      and profile_id = p_profile_id
      and status <> 'cancelled'
  ) then
    raise exception 'profile % is already registered for event %',
      p_profile_id, p_event_id
      using errcode = 'unique_violation';
  end if;

  select count(*) into v_confirmed_count
  from event_registrations
  where event_id = p_event_id
    and status = 'confirmed';

  if v_confirmed_count < v_event.capacity then
    v_status := 'confirmed';
    v_new_position := null;
  elsif v_event.waitlist_enabled then
    v_status := 'waitlisted';
    select coalesce(max(waitlist_position), 0) + 1 into v_new_position
    from event_registrations
    where event_id = p_event_id
      and status = 'waitlisted';
  else
    raise exception 'event % is full', p_event_id
      using errcode = 'check_violation';
  end if;

  insert into event_registrations (
    event_id,
    profile_id,
    price_paid,
    pricing_tier,
    payment_status,
    waitlist_position,
    status
  ) values (
    p_event_id,
    p_profile_id,
    p_price_cents,
    p_pricing_tier,
    p_payment_status,
    v_new_position,
    v_status
  )
  returning * into v_registration;

  return v_registration;
end;
$$;

revoke all on function public.reserve_event_spot(uuid, uuid, text, integer, text) from public;
grant execute on function public.reserve_event_spot(uuid, uuid, text, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- promote_next_waitlisted:
--   Promotes the lowest-numbered waitlisted registration for an event to
--   confirmed (only if capacity is now available). Returns the promoted
--   row, or NULL if nothing was promoted.
--
--   Called after a confirmed registration is cancelled (admin or member)
--   and by the nightly stale-payment-cleanup job. Locks the events row
--   so concurrent calls don't both promote the same person.
-- ---------------------------------------------------------------------------
create or replace function public.promote_next_waitlisted(
  p_event_id uuid
)
returns event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
  v_confirmed_count integer;
  v_next event_registrations;
  v_promoted event_registrations;
begin
  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found then
    return null;
  end if;

  select count(*) into v_confirmed_count
  from event_registrations
  where event_id = p_event_id
    and status = 'confirmed';

  if v_confirmed_count >= v_event.capacity then
    return null;
  end if;

  select * into v_next
  from event_registrations
  where event_id = p_event_id
    and status = 'waitlisted'
  order by waitlist_position asc nulls last, registered_at asc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  update event_registrations
  set status = 'confirmed',
      waitlist_position = null
  where id = v_next.id
  returning * into v_promoted;

  return v_promoted;
end;
$$;

revoke all on function public.promote_next_waitlisted(uuid) from public;
grant execute on function public.promote_next_waitlisted(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- expire_stale_pending_registrations:
--   Marks pending registrations older than the configured waitlist
--   payment-link expiry as cancelled. Called by the nightly cron Edge
--   Function. Returns the cancelled IDs so the caller can promote
--   waitlist successors for each affected event.
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_pending_registrations(
  p_expiry_hours integer
)
returns table (registration_id uuid, event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update event_registrations
  set status = 'cancelled'
  where status in ('confirmed', 'waitlisted')
    and payment_status = 'pending'
    and registered_at < now() - make_interval(hours => p_expiry_hours)
  returning event_registrations.id as registration_id,
            event_registrations.event_id as event_id;
end;
$$;

revoke all on function public.expire_stale_pending_registrations(integer) from public;
grant execute on function public.expire_stale_pending_registrations(integer) to service_role;
