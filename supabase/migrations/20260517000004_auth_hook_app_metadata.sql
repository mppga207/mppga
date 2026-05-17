-- Fix: JWT custom-claims hook must write into app_metadata, not root.
--
-- The previous version (migrations 6 and 7) called
--   jsonb_set(claims, '{role}', ...)
-- which adds the claim at the JWT root. The Supabase JS SDK only
-- surfaces `app_metadata` and `user_metadata` on the user object via
-- `auth.getUser()` — root-level custom claims never reach the
-- middleware, so it always read the default `role = 'member'` and
-- admins landed on /dashboard.
--
-- This rewrite nests `role` and `membership_status` under
-- `app_metadata`, matching the contract in auth-middleware.md §2:
--   const role = session.user.app_metadata.role
--   const status = session.user.app_metadata.membership_status

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
  app_meta jsonb;
begin
  user_id := (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);
  app_meta := coalesce(claims -> 'app_metadata', '{}'::jsonb);

  select role into resolved_role
    from public.profiles
   where id = user_id;

  select status into resolved_status
    from public.memberships
   where profile_id = user_id;

  app_meta := jsonb_set(
    app_meta,
    '{role}',
    to_jsonb(coalesce(resolved_role, 'member')),
    true
  );
  app_meta := jsonb_set(
    app_meta,
    '{membership_status}',
    to_jsonb(coalesce(resolved_status, 'Awaiting_Payment')),
    true
  );

  claims := jsonb_set(claims, '{app_metadata}', app_meta, true);

  return jsonb_set(event, '{claims}', claims, true);
exception
  when others then
    -- Never break login on internal error; middleware handles redirects
    -- when the claims fall back to the defaults the trigger would produce.
    return event;
end;
$$;
