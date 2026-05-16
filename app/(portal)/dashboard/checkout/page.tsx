import Link from "next/link";

import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/mppga/ui/button";

export const metadata = {
  title: "Complete your dues · MPPGA",
};

const dollars = (cents: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function CheckoutPage() {
  const session = await requireSession("/dashboard/checkout");

  // TODO(track 3 — stripe-architecture.md §6.1): replace these reads
  // with the membership row + tier needed to create a real subscription
  // Checkout session. For now we surface the tier price alongside an
  // explanatory CTA so the page is useful in isolation. Two queries
  // because the embedded-join syntax needs `Relationships` defined on
  // the handwritten Database type — easier swapped in once
  // `supabase gen types` runs against a real project.
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("tier_id")
    .eq("profile_id", session.user.id)
    .maybeSingle();

  const { data: tier } = membership?.tier_id
    ? await supabase
        .from("tiers")
        .select("name, description, annual_dues_cents")
        .eq("id", membership.tier_id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
        One step left
      </p>
      <h1 className="mt-3 font-serif text-3xl text-mppga-ink">
        Complete your dues to activate your membership.
      </h1>

      <p className="mt-4 text-sm leading-relaxed text-mppga-ink-soft">
        Welcome to MPPGA. Your account is ready — pay your annual dues
        and your member portal, public directory listing, and event
        member pricing all unlock immediately.
      </p>

      <div className="mt-8 rounded-2xl border border-mppga-divider bg-mppga-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Selected tier
        </p>
        <p className="mt-2 font-serif text-2xl text-mppga-ink">
          {tier?.name ?? "—"}
        </p>
        {tier ? (
          <p className="mt-1 text-sm text-mppga-ink-soft">{tier.description}</p>
        ) : null}
        <p className="mt-4 font-serif text-3xl tracking-tight text-mppga-teal-deep">
          {tier ? dollars(tier.annual_dues_cents) : "—"}
          <span className="ml-1 align-baseline text-sm font-sans text-mppga-ink-muted">
            / year
          </span>
        </p>

        <div className="mt-6">
          <Button size="lg" className="w-full" disabled>
            Pay with Stripe (Track 3)
          </Button>
        </div>

        <p className="mt-3 text-xs text-mppga-ink-muted">
          Stripe Checkout is being wired in Track 3. Until then, the
          board will reach out by email with a manual payment link if
          you’d like to activate early.
        </p>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-mppga-ink-muted">
        MPPGA is a 501(c)(6) nonprofit. Dues are not deductible as
        charitable contributions but may be deductible as ordinary
        business expenses. Talk to your accountant.
      </p>

      <p className="mt-6 text-xs text-mppga-ink-muted">
        Wrong tier?{" "}
        <Link
          href="/contact"
          className="text-mppga-teal hover:text-mppga-teal-hover"
        >
          Email the board
        </Link>{" "}
        and we’ll switch it for you.
      </p>
    </main>
  );
}
