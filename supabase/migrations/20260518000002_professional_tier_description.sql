-- Slim the Professional tier description down to an audience line.
-- The 2026-05-18 realignment migration rewrote `description` to a
-- prose list of every benefit, which then rendered on /join right
-- above the same items as a checkmark list. Per client feedback,
-- the description is the "who is this for" line and the benefits
-- only appear in the checkmark area.

update public.tiers
  set description = 'For full-time groomers and stylists working professionally in Maine.'
  where slug = 'professional';
