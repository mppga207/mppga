-- Testing toggle: skip the Awaiting_Payment step for new signups so the
-- full member flow can be exercised before Stripe is wired up.
--
-- When set to true, createPendingMembership inserts the row with
-- status='Active' and an expires_at one year out instead of
-- Awaiting_Payment. The middleware then lets new accounts through to
-- /dashboard immediately, no Stripe required. Default off so production
-- never accidentally hands out free memberships.

alter table public.site_settings
  add column if not exists signup_skip_payment boolean not null default false;
