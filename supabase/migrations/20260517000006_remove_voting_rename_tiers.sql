-- Drop the voting subsystem and rename the seeded tiers per the
-- 2026-05-17 scope cut. Voting is no longer a planned feature, so the
-- benefit flag, the deferred elections/election_ballots schema notes,
-- and every public-facing "voting rights" string come out together.
-- "Student / Apprentice" becomes "Basic Membership" and
-- "Corporate / Salon" becomes "Salon"; the slugs change to match so
-- the join-form Zod enum stays one-word per slug.

alter table public.tiers drop column voting_rights;

alter table public.tiers rename column corporate_umbrella to umbrella_account;

update public.tiers
  set
    name = 'Basic Membership',
    slug = 'basic',
    description = 'For groomers in school, apprenticing, or in their first year on the bench. Member event pricing and community access; directory listing optional.'
  where slug = 'student';

update public.tiers
  set
    description = 'Standard membership for working groomers. Directory listing, member event pricing, full member portal.'
  where slug = 'professional';

update public.tiers
  set
    name = 'Salon',
    slug = 'salon',
    description = 'Umbrella tier for salons, clinics, and multi-groomer shops. Sub-profiles for staff under one account, priority directory placement.'
  where slug = 'corporate';
