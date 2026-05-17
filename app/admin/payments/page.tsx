import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Payments"
        description="Dues subscriptions and event ticket charges, both flowing through Stripe. Detailed receipts, refunds, and customer history live in the Stripe Dashboard."
        actions={
          <Button variant="secondary" disabled>
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
            Open Stripe Dashboard
          </Button>
        }
      />

      <Card title="Stripe activity">
        <div className="px-6 py-16 text-center">
          <p className="font-serif text-lg text-mppga-ink">
            Subscription and ticket charges will appear here.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mppga-ink-soft">
            We&rsquo;ll surface the most recent invoices, failed payments, and
            event ticket transactions inline. Refunds and customer-level
            actions stay in the Stripe Dashboard.
          </p>
        </div>
      </Card>
    </div>
  );
}
