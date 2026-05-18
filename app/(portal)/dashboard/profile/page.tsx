import { Card } from "@/components/mppga/admin/Card";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { ProfileEditForm } from "@/components/mppga/portal/ProfileEditForm";
import { SalonInfoForm } from "@/components/mppga/portal/SalonInfoForm";
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

  // For Salon-tier members the owner toggle is locked on (it's the
  // whole point of the tier). Anyone else gets to flip it themselves.
  const salonTierLocked = member.tierSlug === "salon";

  // If the user is affiliated with someone else's salon (their
  // organization_id is set but they're not the primary contact),
  // surface that name in the salon section so they understand the
  // owner-toggle would create a separate org rather than edit the
  // one they're affiliated with.
  const affiliatedSalonName =
    !member.isSalonOwner && member.organizationName
      ? member.organizationName
      : null;

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your profile"
        description="The personal details we keep on file."
      />

      <Card title="Personal info">
        <ProfileEditForm
          initialFirstName={member.firstName}
          initialLastName={member.lastName}
          initialPhone={member.phone}
          initialAddressLine={member.addressLine}
          initialCity={member.city}
          initialZip={member.zip}
          email={member.email}
        />
      </Card>

      <Card
        title="Salon information"
        description={
          salonTierLocked
            ? "Your salon's public details. Used in the directory and on event listings."
            : "Add your salon's details if you own or operate one."
        }
      >
        <SalonInfoForm
          salon={member.ownedSalon}
          forced={salonTierLocked}
          affiliatedSalonName={affiliatedSalonName}
        />
      </Card>

      <Card title="Membership">
        <dl className="divide-y divide-mppga-divider">
          <ReadOnlyRow
            label="Tier"
            value={member.tierName ?? "Not yet assigned"}
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
