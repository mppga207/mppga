-- Move the per-tier marketing bullet list out of the application code
-- and onto the `tiers` row. The admin Settings → Tier configuration
-- page becomes the single source of truth for what shows up under
-- each tier on the public Join page.
--
-- `perks` is intentionally free-form text, not a fixed set of flags:
-- the board can add or rephrase bullets without a code change or
-- migration. The existing `directory_listing` and `umbrella_account`
-- columns stay as behavior flags (they gate features, not display
-- copy).
--
-- Seed each existing tier's perks list verbatim with the bullets the
-- Join page already rendered, so nothing disappears the moment the
-- migration lands. The Salon line uses the rendered form ("up to 5
-- employees") rather than the placeholder; admins update the line
-- if they later change the employee limit.

alter table public.tiers
  add column perks text[] not null default '{}';

update public.tiers
  set perks = array[
    'Access to continuing education resources',
    'Member event pricing',
    'Member community access',
    'Directory listing optional'
  ]
  where slug = 'basic';

update public.tiers
  set perks = array[
    'Public directory listing across Maine',
    'Private member community (Facebook group and portal)',
    'Member event pricing',
    'MPPGA membership plaque',
    'Access to future continuing education'
  ]
  where slug = 'professional';

update public.tiers
  set perks = array[
    'Priority placement in the public directory',
    'Covers a salon with up to 5 employees',
    'Member event pricing for the whole team',
    'Salon-level recognition at MPPGA events'
  ]
  where slug = 'salon';
