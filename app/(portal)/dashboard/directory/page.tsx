import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { mockMember } from "@/lib/mppga/portal/mockMember";

export default function DirectoryListingPage() {
  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your directory listing"
        description="This is what pet owners across Maine see when they search for a groomer. You decide what's visible."
        actions={
          <Button variant="secondary" disabled>
            Edit listing
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Public listing
            </p>
            <h2 className="mt-2 font-serif text-2xl text-mppga-ink">
              {mockMember.organizationName ?? mockMember.fullName}
            </h2>
            <p className="mt-2 text-sm text-mppga-ink-soft">{mockMember.city}</p>
          </div>
          <StatusBadge
            label={mockMember.directoryListed ? "Live" : "Hidden"}
            tone={mockMember.directoryListed ? "teal" : "muted"}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Visibility">
          <dl className="divide-y divide-mppga-divider">
            <ToggleRow
              label="Show in public directory"
              on={mockMember.directoryListed}
            />
            <ToggleRow label="Show business phone" on={true} />
            <ToggleRow label="Show personal mobile" on={false} />
            <ToggleRow label="Show street address" on={false} />
          </dl>
          <div className="px-6 py-4 text-xs text-mppga-ink-muted">
            Personal contact fields are hidden by default. Turn them on only if you want them public.
          </div>
        </Card>

        <Card title="Specialties">
          <div className="flex flex-wrap gap-2 px-6 py-5">
            {["Hand-scissoring", "Hand-stripping", "Senior dogs", "Anxious pets"].map((s) => (
              <StatusBadge key={s} label={s} tone="neutral" />
            ))}
          </div>
          <div className="px-6 pb-5 text-xs text-mppga-ink-muted">
            Specialties help owners find the right groomer for their pet.
          </div>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <dt className="text-sm text-mppga-ink">{label}</dt>
      <dd>
        <StatusBadge label={on ? "Visible" : "Hidden"} tone={on ? "teal" : "muted"} />
      </dd>
    </div>
  );
}
