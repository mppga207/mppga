import Link from "next/link";
import { CalendarCheck2, CreditCard, MailQuestion, ShieldCheck } from "lucide-react";

import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import {
  MembershipBadge,
  statusLabel,
} from "@/components/mppga/portal/MembershipBadge";
import { requireSession } from "@/lib/supabase/session";
import { loadMemberOverview } from "@/lib/mppga/portal/data";
import {
  openCustomerPortal,
  startSubscriptionCheckout,
} from "@/lib/stripe/actions";
import type { MembershipStatus } from "@/types/database";

export const metadata = {
  title: "Renew · MPPGA",
  description:
    "Renew your Maine Professional Pet Groomers Association membership and keep your directory listing and member pricing intact.",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

interface RenewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function renewalCopy(status: MembershipStatus) {
  switch (status) {
    case "Lapsed":
      return {
        eyebrow: "Membership lapsed",
        headline: "Welcome back. Pick up where you left off.",
        body:
          "Your MPPGA membership has lapsed. Renew today to restore your directory listing, member event pricing, and access to the portal.",
      };
    case "Grace_Period":
      return {
        eyebrow: "Renewal due",
        headline: "Your membership is in grace period.",
        body:
          "Your dues are past due, but you’re still a member. Renew in the next few days to avoid losing your directory listing and member pricing.",
      };
    case "Suspended":
      return {
        eyebrow: "Membership on hold",
        headline: "Your membership is suspended.",
        body:
          "A board member placed your account on hold. Reach out and we’ll work it out together — renewal is paused until then.",
      };
    case "Awaiting_Payment":
      return {
        eyebrow: "Welcome",
        headline: "One last step — complete your dues.",
        body:
          "Your account is ready. Pay your annual dues to unlock the member portal, the directory listing, and member event pricing.",
      };
    default:
      return {
        eyebrow: "Membership",
        headline: "Manage your membership.",
        body:
          "Update your payment method, review past invoices, or renew early through the secure billing portal.",
      };
  }
}

export default async function RenewPage({ searchParams }: RenewPageProps) {
  const session = await requireSession("/renew");
  const [params, member] = await Promise.all([
    searchParams,
    loadMemberOverview(session),
  ]);

  const status = member.status;
  const copy = renewalCopy(status);
  const reason = readParam(params["reason"]);
  const portalError = readParam(params["portal_error"]);
  const checkoutError = readParam(params["error"]);

  const isSuspended = status === "Suspended" || reason === "suspended";
  const hasStripe = Boolean(member.stripeCustomerId);

  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-20 md:py-24">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                {copy.eyebrow}
              </p>
              <MembershipBadge status={status} />
            </div>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mppga-ink-soft md:text-lg">
              {copy.body}
            </p>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-10 px-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-8 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
                Membership summary
              </p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <SummaryRow
                  label="Tier"
                  value={member.tierName ?? "Not yet assigned"}
                />
                <SummaryRow
                  label="Member since"
                  value={
                    member.memberSinceISO
                      ? dateFmt.format(new Date(member.memberSinceISO))
                      : "—"
                  }
                />
                <SummaryRow
                  label="Expires"
                  value={
                    member.expiresAt
                      ? dateFmt.format(new Date(member.expiresAt))
                      : "—"
                  }
                />
                <SummaryRow label="Status" value={statusLabel(status)} />
              </div>

              <div className="mt-8 border-t border-mppga-divider pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
                  Renew now
                </p>
                <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                  Renewal is handled through Stripe’s secure billing portal —
                  the same place you’d go to update a card or download a past
                  invoice. You’ll be back on the directory within minutes of a
                  successful payment.
                </p>

                {portalError || checkoutError ? (
                  <p className="mt-4 rounded-md border border-mppga-divider bg-mppga-sand px-4 py-3 text-sm text-mppga-ink-soft">
                    We couldn&rsquo;t open the billing portal just now. Try again
                    in a moment, or email{" "}
                    <a
                      href="mailto:mppga207@gmail.com"
                      className="text-mppga-teal hover:text-mppga-teal-hover"
                    >
                      mppga207@gmail.com
                    </a>
                    .
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {hasStripe ? (
                    <form action={openCustomerPortal}>
                      <Button type="submit" size="lg" disabled={isSuspended}>
                        {isSuspended ? "Renewal paused" : "Open billing portal"}
                      </Button>
                    </form>
                  ) : (
                    <form action={startSubscriptionCheckout}>
                      <Button type="submit" size="lg" disabled={isSuspended}>
                        {isSuspended ? "Renewal paused" : "Pay dues now"}
                      </Button>
                    </form>
                  )}
                  <Button href="/dashboard/billing" variant="ghost" size="lg">
                    View past invoices
                  </Button>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                What renewal restores
              </p>
              <BenefitCard
                icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.8} />}
                title="Directory listing"
                body="Your public listing comes back online as soon as payment clears."
              />
              <BenefitCard
                icon={<CalendarCheck2 className="h-4 w-4" strokeWidth={1.8} />}
                title="Member event pricing"
                body="Workshops and clinics revert to the discounted member price for the rest of the year."
              />
              <BenefitCard
                icon={<CreditCard className="h-4 w-4" strokeWidth={1.8} />}
                title="Automatic next year"
                body="After this renewal, Stripe handles the recurring annual charge so you don’t have to think about it."
              />
            </aside>
          </div>
        </section>

        {isSuspended ? (
          <section className="border-b border-mppga-divider bg-mppga-sand py-16">
            <div className="mx-auto max-w-[1140px] px-6">
              <div className="flex items-start gap-4 rounded-2xl border border-mppga-sand-deep bg-mppga-card p-6 shadow-sm">
                <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
                  <MailQuestion className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="font-serif text-xl text-mppga-ink">
                    Talk to the board first.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-mppga-ink-soft">
                    A board member needs to lift the hold before renewal can
                    proceed. Send a note to{" "}
                    <a
                      href="mailto:mppga207@gmail.com"
                      className="text-mppga-teal hover:text-mppga-teal-hover"
                    >
                      mppga207@gmail.com
                    </a>{" "}
                    and we’ll get back to you.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/contact"
                      className="text-sm text-mppga-teal hover:text-mppga-teal-hover"
                    >
                      Or use the contact form →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-mppga-page py-16">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 text-sm leading-relaxed text-mppga-ink-soft">
              <p>
                <strong className="font-medium text-mppga-ink">Heads up:</strong>{" "}
                MPPGA is a 501(c)(6) nonprofit. Dues are not deductible as
                charitable contributions for federal income tax purposes but
                may be deductible as ordinary business expenses. Your renewal
                receipt will spell this out — keep a copy for your accountant.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-mppga-ink">{value}</p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-mppga-divider bg-mppga-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-mppga-ink">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-mppga-ink-soft">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
