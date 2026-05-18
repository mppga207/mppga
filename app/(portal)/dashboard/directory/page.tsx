import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { DirectoryToggleRow } from "@/components/mppga/portal/DirectoryToggleRow";
import { requireSession } from "@/lib/supabase/session";
import {
  loadDirectoryListing,
  loadMemberOverview,
} from "@/lib/mppga/portal/data";
import { requestDirectoryListingAction } from "@/lib/mppga/portal/directory-listing-request";

type DirectoryStatus = "requested" | "invalid" | "error" | null;

function readStatus(value: string | string[] | undefined): DirectoryStatus {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "requested" || v === "invalid" || v === "error") return v;
  return null;
}

export default async function DirectoryListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession("/dashboard/directory");
  const [listing, member, sp] = await Promise.all([
    loadDirectoryListing(session),
    loadMemberOverview(session),
    searchParams,
  ]);
  const status = readStatus(sp.status);

  if (!listing) {
    return (
      <div className="space-y-10">
        <PortalPageHeader
          title="Set up your directory listing"
          description="Tell us how your business should appear to pet owners searching for a Maine groomer. We'll build the public listing from what you enter here."
        />

        {status === "requested" ? (
          <div
            className="rounded-lg border border-mppga-teal/40 bg-mppga-teal-tint px-5 py-4 text-sm text-mppga-teal-darker"
            role="status"
          >
            Thanks, your listing details are in. We&rsquo;ll publish your
            directory listing within a few business days.
          </div>
        ) : null}
        {status === "invalid" ? (
          <div
            className="rounded-lg border border-mppga-divider bg-mppga-sand px-5 py-4 text-sm text-mppga-ink"
            role="alert"
          >
            We couldn&rsquo;t read every field. Double-check the required
            fields and try again.
          </div>
        ) : null}
        {status === "error" ? (
          <div
            className="rounded-lg border border-mppga-divider bg-mppga-sand px-5 py-4 text-sm text-mppga-ink"
            role="alert"
          >
            Something went wrong on our end. Please try again, or email{" "}
            <a
              href="mailto:mppga207@gmail.com"
              className="text-mppga-teal hover:text-mppga-teal-hover"
            >
              mppga207@gmail.com
            </a>{" "}
            directly while we look into it.
          </div>
        ) : null}

        <Card className="p-6">
          <DirectoryListingForm member={member} />
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
        description="How your business appears to pet owners searching for a Maine groomer. Toggle what's public. Address and contact info are off by default."
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
          Editing these fields needs an address re-geocode, coming with the
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

type MemberDefaults = Awaited<ReturnType<typeof loadMemberOverview>>;

function DirectoryListingForm({ member }: { member: MemberDefaults }) {
  const defaultDisplayName =
    member.organizationName ?? member.fullName ?? "";
  const defaultAddress =
    member.ownedSalon?.addressLine ?? member.addressLine ?? "";
  const defaultCity = member.ownedSalon?.city ?? member.city ?? "";
  const defaultZip = member.ownedSalon?.zip ?? member.zip ?? "";
  const defaultState = member.ownedSalon?.state ?? member.state ?? "ME";
  const defaultBusinessPhone =
    member.ownedSalon?.phone ?? member.phone ?? "";
  const defaultPublicEmail = member.email ?? "";

  return (
    <form action={requestDirectoryListingAction} className="space-y-5">
      <input type="hidden" name="contact_name" value={member.fullName} />
      <input type="hidden" name="contact_email" value={member.email} />

      <FormField label="Business or display name" htmlFor="listing-name">
        <input
          id="listing-name"
          name="display_name"
          type="text"
          required
          maxLength={120}
          defaultValue={defaultDisplayName}
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Short bio"
        htmlFor="listing-bio"
        hint="Optional. One or two sentences about your grooming work."
      >
        <textarea
          id="listing-bio"
          name="bio"
          rows={3}
          maxLength={1000}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </FormField>

      <FormField label="Street address" htmlFor="listing-address">
        <input
          id="listing-address"
          name="address_line"
          type="text"
          required
          maxLength={160}
          defaultValue={defaultAddress}
          autoComplete="street-address"
          className={inputClass}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr_1fr]">
        <FormField label="City" htmlFor="listing-city">
          <input
            id="listing-city"
            name="city"
            type="text"
            required
            maxLength={80}
            defaultValue={defaultCity}
            autoComplete="address-level2"
            className={inputClass}
          />
        </FormField>
        <FormField label="State" htmlFor="listing-state">
          <input
            id="listing-state"
            name="state"
            type="text"
            maxLength={40}
            defaultValue={defaultState}
            autoComplete="address-level1"
            className={inputClass}
          />
        </FormField>
        <FormField label="Zip" htmlFor="listing-zip">
          <input
            id="listing-zip"
            name="zip"
            type="text"
            required
            maxLength={20}
            defaultValue={defaultZip}
            autoComplete="postal-code"
            className={inputClass}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Business phone"
          htmlFor="listing-phone"
          hint="Optional. Shown publicly if you turn the toggle on."
        >
          <input
            id="listing-phone"
            name="business_phone"
            type="tel"
            maxLength={40}
            defaultValue={defaultBusinessPhone}
            autoComplete="tel"
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Public email"
          htmlFor="listing-email"
          hint="Optional. Shown publicly if you turn the toggle on."
        >
          <input
            id="listing-email"
            name="public_email"
            type="email"
            maxLength={200}
            defaultValue={defaultPublicEmail}
            autoComplete="email"
            className={inputClass}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-mppga-ink-muted">
          Personal contact fields stay hidden by default. You can toggle
          visibility once the listing is live.
        </p>
        <Button type="submit">Submit for review</Button>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30";

function FormField({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs text-mppga-ink-muted">
          {hint}
        </span>
      ) : null}
    </label>
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
