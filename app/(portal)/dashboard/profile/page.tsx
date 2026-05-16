import { Card } from "@/components/mppga/admin/Card";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { ProfileEditForm } from "@/components/mppga/portal/ProfileEditForm";
import { requireSession } from "@/lib/supabase/session";
import { loadMemberOverview } from "@/lib/mppga/portal/data";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function ProfilePage() {
  const session = await requireSession("/dashboard/profile");
  const member = await loadMemberOverview(session);

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your profile"
        description="The personal details we keep on file. Email changes go through the board — everything else is yours to edit."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Personal info">
          <ProfileEditForm
            initialFullName={member.fullName}
            initialPhone={member.phone}
            email={member.email}
          />
        </Card>

        <Card title="Affiliation">
          <dl className="divide-y divide-mppga-divider">
            <ReadOnlyRow
              label="Tier"
              value={member.tierName ?? "Not yet assigned"}
            />
            <ReadOnlyRow
              label="Organization"
              value={member.organizationName ?? "—"}
            />
            <ReadOnlyRow
              label="Member since"
              value={
                member.memberSinceISO
                  ? dateFmt.format(new Date(member.memberSinceISO))
                  : "—"
              }
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
            href="mailto:mppga207@gmail.com"
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            mppga207@gmail.com
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
