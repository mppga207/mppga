-- Phase 1, Track 1: custom JWT claims hook per auth-middleware.md §2.1.
--
-- Supabase Auth invokes this function on every JWT issuance/refresh. It
-- merges `role` (profiles.role) and `membership_status` (memberships.status)
-- into the JWT so middleware can read them without hitting the database.
--
-- Must NEVER raise — a raised exception breaks login. On any internal
-- failure we return the event unchanged so login succeeds with default
-- claims and the middleware handles the redirect.
--
-- The hook is bound per environment via the Supabase dashboard
-- (Authentication → Hooks → Custom Access Token).

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
  claims := jsonb_set(claims, '{membership_status}', to_jsonb(coalesce(resolved_status, 'Pending_Approval')));

  return jsonb_set(event, '{claims}', claims);
exception
  when others then
    -- Never break login on internal error; middleware handles redirects
    -- when the claims fall back to the defaults the trigger would produce.
    return event;
end;
$$;

-- Auth hooks call this function as the supabase_auth_admin role.
grant execute on function public.handle_auth_jwt_claims(jsonb) to supabase_auth_admin;

-- The function is SECURITY DEFINER and runs as the migration owner; it
-- needs to read from these tables regardless of the caller's grants.
grant select on public.profiles to supabase_auth_admin;
grant select on public.memberships to supabase_auth_admin;
