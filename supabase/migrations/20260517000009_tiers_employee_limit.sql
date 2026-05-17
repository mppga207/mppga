-- Replace the bare `umbrella_account` benefit flag with a human-readable
-- "salon coverage" cap. The flag stays (a tier either covers a salon or
-- it doesn't), but tiers that turn it on now carry a positive integer
-- cap so the admin editor and the public Join page can render
-- "Covers a salon with up to N employees".
--
-- Salon ships with a cap of 5 per the 2026-05-17 product decision.
-- Existing tiers without the umbrella flag stay null.

alter table public.tiers
  add column umbrella_employee_limit integer;

alter table public.tiers
  add constraint tiers_umbrella_employee_limit_positive
  check (
    umbrella_employee_limit is null
    or umbrella_employee_limit > 0
  );

alter table public.tiers
  add constraint tiers_umbrella_employee_limit_requires_flag
  check (
    umbrella_employee_limit is null
    or umbrella_account = true
  );

update public.tiers
  set umbrella_employee_limit = 5
  where slug = 'salon';
