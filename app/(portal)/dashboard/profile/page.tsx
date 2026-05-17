import { Card } from "@/components/mppga/admin/Card";
import { EmailChangeForm } from "@/components/mppga/portal/EmailChangeForm";
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
        description="The personal details we keep on file."
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
              value={member.organizationName ?? "-"}
            />
            <ReadOnlyRow
              label="Member since"
              value={
                member.memberSinceISO
                  ? dateFmt.format(new Date(member.memberSinceISO))
                  : "-"
              }
            />
          </dl>
        </Card>
      </div>

      <Card
        title="Email"
        description="Sign in with your email and password. Changing it sends a confirmation link to your new address."
      >
        <EmailChangeForm currentEmail={member.email} />
      </Card>

      <Card
        title="Password"
        description="Reset from the sign-in page."
      >
        <div className="px-6 py-6 text-sm text-mppga-ink-soft">
          You can change your password from the sign-in page.
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
