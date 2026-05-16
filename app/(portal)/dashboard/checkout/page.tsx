import Link from "next/link";

import { startSubscriptionCheckout } from "@/lib/stripe/actions";
import { isPreviewSession, requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { previewCheckoutTier } from "@/lib/mppga/portal/preview";
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

interface CheckoutPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readError(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const session = await requireSession("/dashboard/checkout");
  const params = await searchParams;
  const errorCode = readError(params["error"]);
  const wasCancelled = readError(params["checkout"]) === "cancelled";

  // Two queries instead of an embedded join: the handwritten Database
  // type doesn't declare relationships. Will collapse once
  // `supabase gen types` runs against a real project.
  const tier = isPreviewSession(session)
    ? previewCheckoutTier()
    : await loadCheckoutTier(session.user.id);

  const stripeReady = Boolean(tier?.stripe_price_id);

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

      {wasCancelled ? (
        <p className="mt-6 rounded-md border border-mppga-divider bg-mppga-sand px-4 py-3 text-sm text-mppga-ink-soft">
          No charge was made. You can resume your payment any time —
          your account stays open.
        </p>
      ) : null}

      {errorCode ? <CheckoutErrorBanner code={errorCode} /> : null}

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

        <form action={startSubscriptionCheckout} className="mt-6">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!stripeReady}
          >
            Pay with Stripe
          </Button>
        </form>

        {!stripeReady ? (
          <p className="mt-3 text-xs text-mppga-ink-muted">
            Stripe payments aren’t live yet — the board is configuring
            Stripe. We’ll email you the moment payment opens up. In the
            meantime your account stays here, ready to go.
          </p>
        ) : null}
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

async function loadCheckoutTier(profileId: string) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("tier_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!membership?.tier_id) return null;

  const { data: tier } = await supabase
    .from("tiers")
    .select("name, description, annual_dues_cents, stripe_price_id")
    .eq("id", membership.tier_id)
    .maybeSingle();
  return tier;
}

function CheckoutErrorBanner({ code }: { code: string }) {
  const message =
    code === "missing_price"
      ? "Your tier doesn’t have a payment plan configured yet. The board is finishing setup — try again shortly or email us."
      : code === "missing_membership"
        ? "We couldn’t find your membership record. Try signing in again."
        : "Something went wrong starting checkout. Try again, or email the board if it keeps happening.";
  return (
    <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </p>
  );
}
