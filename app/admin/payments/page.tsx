import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Payments"
        description="Dues, event tickets, and the Stripe activity that keeps the association funded."
      />

      <Card
        title="Stripe activity"
        description="Subscription and one-off ticket transactions will surface here once the Stripe webhook is wired up."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          Coming soon.
        </div>
      </Card>
    </div>
  );
}
