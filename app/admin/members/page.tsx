import { Download, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";

const statusChips = [
  "Pending approval",
  "Awaiting payment",
  "Active",
  "Grace period",
  "Lapsed",
  "Suspended",
  "Honorary",
];

export default function AdminMembersPage() {
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Members"
        description="Search, filter, and act on every member. Approvals, status overrides, and CSV exports all live here once Supabase is wired."
        actions={
          <Button variant="secondary" disabled>
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Export CSV
          </Button>
        }
      />

      <Card>
        <div className="space-y-4 border-b border-mppga-divider px-6 py-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mppga-ink-muted"
              strokeWidth={1.8}
            />
            <input
              type="text"
              disabled
              placeholder="Search by name, email, or organization"
              className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page pl-10 pr-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Status
            </p>
            {statusChips.map((label) => (
              <span
                key={label}
                aria-disabled
                className="cursor-not-allowed rounded-full border border-mppga-divider bg-mppga-page px-3 py-1 text-xs text-mppga-ink-muted"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 py-16 text-center">
          <p className="font-serif text-lg text-mppga-ink">
            The members table appears here.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mppga-ink-soft">
            Name, email, status, tier, expiry, and organization — sortable
            and filterable per the spec in admin-portal.md §4. Wiring to
            Supabase is the next milestone.
          </p>
        </div>
      </Card>
    </div>
  );
}
