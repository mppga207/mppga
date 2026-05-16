-- Phase 1, Track 2: drop board-approval workflow.
--
-- Pivot per client decision (2026-05-16): members are auto-accepted into
-- Awaiting_Payment as soon as their magic link is verified, and become
-- Active on first successful dues payment via the Stripe webhook. The
-- Pending_Approval status and the approval audit columns on `memberships`
-- have no consumer once the board review step is gone.

-- 1. Status enum no longer carries Pending_Approval.
alter table public.memberships
  drop constraint memberships_status_check;

alter table public.memberships
  add constraint memberships_status_check check (
    status in (
      'Awaiting_Payment',
      'Active',
      'Grace_Period',
      'Lapsed',
      'Suspended',
      'Honorary'
    )
  );

alter table public.memberships
  alter column status set default 'Awaiting_Payment';

-- 2. Approval audit columns have no role in the auto-accept flow. Any
-- admin status flip is already captured in admin_action_log.
alter table public.memberships
  drop column approved_at,
  drop column approved_by_profile_id;

-- 3. Auth hook now defaults to 'Awaiting_Payment' when a profile has no
-- membership row yet (race during signup), matching the new state machine.
create or replace function public.handle_auth_jwt_claims(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid;
  resolved_role text;
  resolved_status text;
  claims jsonb;
begin
  user_id := (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  select role into resolved_role
    from public.profiles
   where id = user_id;

  select status into resolved_status
    from public.memberships
   where profile_id = user_id;

  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(resolved_role, 'member')));
  claims := jsonb_set(
    claims,
    '{membership_status}',
    to_jsonb(coalesce(resolved_status, 'Awaiting_Payment'))
  );

  return jsonb_set(event, '{claims}', claims);
exception
  when others then
    return event;
end;
$$;
