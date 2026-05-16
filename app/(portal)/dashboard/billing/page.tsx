import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { MembershipBadge } from "@/components/mppga/portal/MembershipBadge";
import { mockInvoices, mockMember } from "@/lib/mppga/portal/mockMember";
import { openCustomerPortal } from "@/lib/stripe/actions";

const longDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BillingPage() {
  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Billing"
        description="Your membership, payment method, and past invoices — all handled through Stripe's secure billing portal."
        actions={
          <form action={openCustomerPortal}>
            <Button type="submit" variant="primary">
              Manage in Stripe
            </Button>
          </form>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Current membership
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className="font-serif text-2xl text-mppga-ink">
                {mockMember.tierName}
              </p>
              <MembershipBadge status={mockMember.status} />
            </div>
            <p className="mt-2 text-sm text-mppga-ink-soft">
              Renews {longDateFmt.format(new Date(mockMember.expiresAtISO))}
            </p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-mppga-ink-muted">
            Card updates, cancellation, and invoice downloads all happen
            inside the Stripe billing portal. The button up top opens it in a
            new tab once wired.
          </p>
        </div>
      </Card>

      <Card title="Invoices" description="Your dues receipts.">
        {mockInvoices.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
            No invoices yet.
          </div>
        ) : (
          <ul className="divide-y divide-mppga-divider">
            {mockInvoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-mppga-ink">
                    {inv.description}
                  </p>
                  <p className="mt-1 text-xs text-mppga-ink-muted">
                    {shortDateFmt.format(new Date(inv.dateISO))} · {inv.id}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-serif text-lg text-mppga-ink">
                    {dollars(inv.amountCents)}
                  </span>
                  <StatusBadge
                    label={inv.status === "paid" ? "Paid" : inv.status === "open" ? "Open" : "Void"}
                    tone={inv.status === "paid" ? "teal" : inv.status === "open" ? "warn" : "muted"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
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
