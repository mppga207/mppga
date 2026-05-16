-- Phase 1, Track 1: seed rows per data-model.md §10.
-- The singletons (email_settings, site_settings) and the three tier
-- placeholders. No example members, no example events.
--
-- Tier annual_dues_cents seeded with the "common nonprofit defaults" the
-- client picked for Phase 1 — Student $25, Professional $75, Corporate
-- $200. stripe_product_id / stripe_price_id stay NULL until Track 3
-- creates the Stripe Price objects.

insert into public.email_settings (id) values (default)
  on conflict (id) do nothing;

insert into public.site_settings (id) values (default)
  on conflict (id) do nothing;

insert into public.tiers (
  name,
  slug,
  annual_dues_cents,
  voting_rights,
  directory_listing,
  corporate_umbrella,
  display_order,
  description
) values
  (
    'Student / Apprentice',
    'student',
    2500,
    false,
    false,
    false,
    10,
    'Discounted tier for grooming students and apprentices. No voting rights, no directory listing; CE access only.'
  ),
  (
    'Professional',
    'professional',
    7500,
    true,
    true,
    false,
    20,
    'Standard membership for working groomers. Full voting rights, directory listing, full member portal.'
  ),
  (
    'Corporate / Salon',
    'corporate',
    20000,
    true,
    true,
    true,
    30,
    'Premium umbrella tier for salons and clinics. Sub-profiles for staff, priority directory placement.'
  )
on conflict (slug) do nothing;
