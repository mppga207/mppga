import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { mockMember } from "@/lib/mppga/portal/mockMember";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function ProfilePage() {
  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your profile"
        actions={
          <Button variant="secondary" disabled>
            Edit profile
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Personal info">
          <dl className="divide-y divide-mppga-divider">
            <ReadOnlyRow label="Full name" value={mockMember.fullName} />
            <ReadOnlyRow label="Email" value={mockMember.email} />
            <ReadOnlyRow label="City" value={mockMember.city} />
            <ReadOnlyRow
              label="Member since"
              value={dateFmt.format(new Date(mockMember.memberSinceISO))}
            />
          </dl>
        </Card>

        <Card title="Affiliation">
          <dl className="divide-y divide-mppga-divider">
            <ReadOnlyRow
              label="Tier"
              value={mockMember.tierName}
            />
            <ReadOnlyRow
              label="Organization"
              value={mockMember.organizationName ?? "—"}
            />
          </dl>
        </Card>
      </div>

      <Card
        title="Password & sign-in"
        description="Magic-link sign-in is the default. You'll never need to remember a password."
      >
        <div className="px-6 py-6 text-sm text-mppga-ink-soft">
          We&rsquo;ll email you a one-time sign-in link whenever you need to log in.
          If you need to update the email on file, contact us at{" "}
          <a
            href="mailto:hello@mppga.org"
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            hello@mppga.org
          </a>
          .
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </dt>
      <dd className="text-sm text-mppga-ink">{value}</dd>
    </div>
  );
}
