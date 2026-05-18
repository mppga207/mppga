-- Re-align the Professional tier to the client's 2026-05-18 plan:
-- $45/year (down from the original $75 placeholder) with the benefit
-- list she described: directory listing, private member community
-- (FB group + portal), member event pricing, an MPPGA plaque, and
-- access to future education. The dues edit goes directly on the
-- column because Stripe isn't provisioned yet (no Price object to
-- swap, no subscribers to migrate). Once Stripe is connected the
-- admin Tier configuration tab handles future changes via the
-- create-new + archive-old flow in stripe-architecture.md §6.5.

update public.tiers
  set
    annual_dues_cents = 4500,
    description = 'Standard membership for working groomers. Public directory listing, private member community, member event pricing, MPPGA plaque, and access to future continuing education.'
  where slug = 'professional';
