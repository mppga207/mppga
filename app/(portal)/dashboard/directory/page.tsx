import { Card } from "@/components/mppga/admin/Card";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { DirectoryToggleRow } from "@/components/mppga/portal/DirectoryToggleRow";
import { requireSession } from "@/lib/supabase/session";
import {
  loadDirectoryListing,
  loadMemberOverview,
} from "@/lib/mppga/portal/data";

export default async function DirectoryListingPage() {
  const session = await requireSession("/dashboard/directory");
  const [listing, member] = await Promise.all([
    loadDirectoryListing(session),
    loadMemberOverview(session),
  ]);

  if (!listing) {
    return (
      <div className="space-y-10">
        <PortalPageHeader
          title="Your directory listing"
          description="How your business appears to pet owners searching for a Maine groomer."
        />

        <Card className="p-6">
          <p className="font-serif text-xl text-mppga-ink">
            We haven&rsquo;t set up your listing yet.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mppga-ink-soft">
            Listings include your business name, city, and the specialties
            you offer — and they&rsquo;re what pet owners see when they search
            the directory. Email us your business address and we&rsquo;ll get
            your listing live.
          </p>
          <p className="mt-4 text-sm">
            <a
              href="mailto:mppga207@gmail.com"
              className="text-mppga-teal hover:text-mppga-teal-hover"
            >
              mppga207@gmail.com
            </a>
          </p>
        </Card>
      </div>
    );
  }

  const headline =
    listing.displayName ||
    member.organizationName ||
    member.fullName ||
    "Your listing";

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Your directory listing"
        description="How your business appears to pet owners searching for a Maine groomer. Toggle what's public — address and contact info are off by default."
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Public listing
            </p>
            <h2 className="mt-2 font-serif text-2xl text-mppga-ink">
              {headline}
            </h2>
            <p className="mt-2 text-sm text-mppga-ink-soft">
              {listing.city}, {listing.state}
            </p>
            {listing.bio ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mppga-ink-soft">
                {listing.bio}
              </p>
            ) : null}
          </div>
          <StatusBadge
            label={listing.isVisible ? "Live" : "Hidden"}
            tone={listing.isVisible ? "teal" : "muted"}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Visibility">
          <div className="divide-y divide-mppga-divider">
            <DirectoryToggleRow
              flag="is_visible"
              label="Show in public directory"
              initial={listing.isVisible}
            />
            <DirectoryToggleRow
              flag="show_business_phone"
              label="Show business phone"
              initial={listing.showBusinessPhone}
            />
            <DirectoryToggleRow
              flag="show_public_email"
              label="Show email"
              initial={listing.showPublicEmail}
            />
            <DirectoryToggleRow
              flag="show_personal_mobile"
              label="Show personal mobile"
              initial={listing.showPersonalMobile}
              confirmOnEnable
              confirmMessage="Your personal mobile will be visible to anyone who finds your listing. Continue?"
            />
            <DirectoryToggleRow
              flag="show_address"
              label="Show street address"
              initial={listing.showAddress}
              confirmOnEnable
              confirmMessage="Your street address will be visible to anyone who finds your listing. Continue?"
            />
          </div>
          <div className="px-6 py-4 text-xs text-mppga-ink-muted">
            Personal contact fields are hidden by default. Turn them on only if you want them public.
          </div>
        </Card>

        <Card title="Specialties">
          {listing.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-6 py-5">
              {listing.specialties.map((s) => (
                <StatusBadge key={s} label={s} tone="neutral" />
              ))}
            </div>
          ) : (
            <div className="px-6 py-5 text-sm text-mppga-ink-soft">
              No specialties on file yet.
            </div>
          )}
          <div className="px-6 pb-5 text-xs text-mppga-ink-muted">
            Specialties help owners find the right groomer for their pet. To
            update them, email{" "}
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

      <Card title="Contact details">
        <dl className="divide-y divide-mppga-divider">
          <ContactRow
            label="Business phone"
            value={listing.businessPhone}
            visible={listing.showBusinessPhone}
          />
          <ContactRow
            label="Personal mobile"
            value={listing.personalMobile}
            visible={listing.showPersonalMobile}
          />
          <ContactRow
            label="Public email"
            value={listing.publicEmail}
            visible={listing.showPublicEmail}
          />
          <ContactRow
            label="Street address"
            value={listing.addressLine}
            visible={listing.showAddress}
          />
        </dl>
        <div className="px-6 py-4 text-xs text-mppga-ink-muted">
          Editing these fields needs an address re-geocode — coming with the
          directory map. For now, email{" "}
          <a
            href="mailto:mppga207@gmail.com"
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            mppga207@gmail.com
          </a>{" "}
          to update anything here.
        </div>
      </Card>
    </div>
  );
}

function ContactRow({
  label,
  value,
  visible,
}: {
  label: string;
  value: string | null;
  visible: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </dt>
      <dd className="flex items-center gap-3 text-sm text-mppga-ink">
        <span>{value ?? "Not on file"}</span>
        <StatusBadge
          label={visible ? "Public" : "Hidden"}
          tone={visible ? "teal" : "muted"}
        />
      </dd>
    </div>
  );
}
