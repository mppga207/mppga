import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";

const summaryCards: Array<{ label: string; value: string; note: string }> = [
  { label: "Active members", value: "127", note: "+4 this month" },
  { label: "Pending applications", value: "3", note: "Awaiting board review" },
  { label: "Upcoming events", value: "4", note: "Next: Jun 14, Portland" },
  { label: "Dues collected · YTD", value: "$5,715", note: "501(c)(6) — non-deductible" },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Overview"
        description="A snapshot of where the association stands today — membership health, money, and what's next on the calendar."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              {card.label}
            </p>
            <p className="mt-3 font-serif text-3xl tracking-tight text-mppga-teal-deep">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-mppga-ink-soft">{card.note}</p>
          </Card>
        ))}
      </div>

      <Card
        title="Recent activity"
        description="Cross-cutting feed will land here once Supabase is wired up."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          No activity yet.
        </div>
      </Card>
    </div>
  );
}
