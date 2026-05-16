import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { MembershipBadge } from "@/components/mppga/portal/MembershipBadge";
import { openCustomerPortal } from "@/lib/stripe/actions";
import { requireSession } from "@/lib/supabase/session";
import { loadMemberOverview } from "@/lib/mppga/portal/data";

const longDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

interface BillingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await requireSession("/dashboard/billing");
  const [params, member] = await Promise.all([
    searchParams,
    loadMemberOverview(session),
  ]);
  const portalError = readParam(params["portal_error"]);
  const hasStripe = Boolean(member.stripeCustomerId);

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Billing"
        description="Your membership, payment method, and past invoices — all handled through Stripe's secure billing portal."
        actions={
          hasStripe ? (
            <form action={openCustomerPortal}>
              <Button type="submit" variant="primary">
                Manage in Stripe
              </Button>
            </form>
          ) : (
            <Button variant="secondary" disabled>
              Manage in Stripe
            </Button>
          )
        }
      />

      {portalError ? <PortalErrorBanner code={portalError} /> : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Current membership
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="font-serif text-2xl text-mppga-ink">
                {member.tierName ?? "Not assigned"}
              </p>
              <MembershipBadge status={member.status} />
            </div>
            {member.expiresAt ? (
              <p className="mt-2 text-sm text-mppga-ink-soft">
                Renews {longDateFmt.format(new Date(member.expiresAt))}
              </p>
            ) : member.status === "Honorary" ? (
              <p className="mt-2 text-sm text-mppga-ink-soft">
                Honorary membership — no recurring dues.
              </p>
            ) : null}
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-mppga-ink-muted">
            Card updates, cancellation, and invoice history all live inside the
            Stripe billing portal. The button up top opens it for you.
          </p>
        </div>
      </Card>

      <Card title="Invoices" description="Your dues receipts.">
        <div className="px-6 py-8 text-sm text-mppga-ink-soft">
          {hasStripe ? (
            <>
              Your invoice history is kept in Stripe. Open the billing portal
              above to download past receipts.
            </>
          ) : (
            <>No invoices yet. They&rsquo;ll appear here once dues are paid.</>
          )}
        </div>
      </Card>

      <Card className="border-mppga-divider bg-mppga-page p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Tax note
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mppga-ink-soft">
          Dues paid to MPPGA are not deductible as charitable contributions for
          federal income tax purposes but may be deductible as ordinary business
          expenses. We&rsquo;re a 501(c)(6) trade association.
        </p>
      </Card>
    </div>
  );
}

function PortalErrorBanner({ code }: { code: string }) {
  const message =
    code === "no_customer"
      ? "We don't have a Stripe customer on file for you yet. Once your first dues payment clears, the portal will open here."
      : "We couldn't open the Stripe portal just now. Try again in a moment, or email mppga207@gmail.com.";
  return (
    <div className="rounded-md border border-mppga-divider bg-mppga-sand px-4 py-3 text-sm text-mppga-ink-soft">
      {message}
    </div>
  );
}
