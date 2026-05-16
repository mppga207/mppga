import { Send } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";

// Template keys mirror email-automation.md §5. Automated templates fire from
// triggers (welcome, renewal, dunning, etc.); manual templates are admin-sent.
const templates: ReadonlyArray<{
  key: string;
  name: string;
  type: "Automated" | "Manual";
}> = [
  { key: "welcome", name: "Welcome", type: "Automated" },
  { key: "renewal-reminder", name: "Renewal reminder", type: "Automated" },
  { key: "dunning", name: "Payment failed", type: "Automated" },
  { key: "event-confirmation", name: "Event confirmation", type: "Automated" },
  { key: "waitlist-confirmation", name: "Waitlist confirmation", type: "Automated" },
  {
    key: "waitlist-promoted-payment",
    name: "Off the waitlist — payment required",
    type: "Automated",
  },
  { key: "event-reminder", name: "Event reminder", type: "Automated" },
  { key: "event-announcement", name: "Event announcement", type: "Manual" },
  { key: "registration-cancelled", name: "Registration cancelled", type: "Automated" },
  { key: "general-update", name: "General update", type: "Manual" },
];

export default function AdminEmailsPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Emails"
        description="The templates and send-timing for every message that goes to a member. Editing the body of any template syncs to Resend."
        actions={
          <Button variant="primary" disabled>
            <Send className="h-4 w-4" strokeWidth={1.8} />
            Send announcement
          </Button>
        }
      />

      <Card
        title="Templates"
        description="One row per template key. Editing is being wired up."
      >
        <ul className="divide-y divide-mppga-divider">
          {templates.map((t) => (
            <li
              key={t.key}
              className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
            >
              <div>
                <p className="text-sm font-medium text-mppga-ink">{t.name}</p>
                <p className="mt-0.5 font-mono text-xs text-mppga-ink-muted">
                  {t.key}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    t.type === "Automated"
                      ? "rounded-full bg-mppga-teal-tint px-3 py-1 text-xs text-mppga-teal-deep"
                      : "rounded-full bg-mppga-sand px-3 py-1 text-xs text-mppga-ink-soft"
                  }
                >
                  {t.type}
                </span>
                <Button variant="ghost" disabled>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Send timing"
        description="Admin-configurable schedules from email-automation.md §2. Editing lands soon."
      >
        <dl className="divide-y divide-mppga-divider">
          <TimingRow
            label="Renewal reminders"
            value="30 / 7 / 1 days before expiry"
          />
          <TimingRow label="Event reminders" value="48 / 2 hours before start" />
          <TimingRow label="Dunning retries" value="3 / 7 / 14 days after failure" />
          <TimingRow
            label="Waitlist payment link"
            value="24 hours before expiry"
          />
        </dl>
      </Card>
    </div>
  );
}

function TimingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <dt className="text-sm text-mppga-ink">{label}</dt>
      <dd className="font-mono text-xs text-mppga-ink-muted">{value}</dd>
    </div>
  );
}
