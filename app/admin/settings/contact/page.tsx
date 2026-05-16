import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { Button } from "@/components/mppga/ui/button";
import { updateSiteContactAction } from "@/lib/admin/settings-actions";
import { loadSiteContact } from "@/lib/admin/settings-data";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "Contact & site info · Admin · MPPGA",
};

export default async function AdminSettingsContactPage({
  searchParams,
}: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const contact = await loadSiteContact();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Contact & site info"
        description="The public-facing email and phone. Changes propagate to every email footer, the Contact page, and the dashboard support link."
      />

      <SettingsTabs active="/admin/settings/contact" />

      {ok === "saved" ? (
        <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
          Contact info saved. The change is live everywhere it surfaces.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
          {error === "invalid_email"
            ? "That email doesn’t look valid. Double-check the address."
            : `Something went wrong: ${error}.`}
        </div>
      ) : null}

      <Card title="Public contact">
        {contact ? (
          <form
            action={updateSiteContactAction}
            className="space-y-5 px-6 py-6"
          >
            <Field
              label="Contact email"
              id="contact-email"
              helper="Used as the from-address on transactional email and shown in the footer of every page."
            >
              <input
                id="contact-email"
                name="contact_email"
                type="email"
                required
                defaultValue={contact.contactEmail}
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </Field>

            <Field
              label="Contact phone"
              id="contact-phone"
              helper="Optional. Leave blank to hide."
            >
              <input
                id="contact-phone"
                name="contact_phone"
                type="tel"
                defaultValue={contact.contactPhone ?? ""}
                placeholder="(207) 555-0100"
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </Field>

            <div className="flex items-center justify-between border-t border-mppga-divider pt-4">
              <p className="text-xs text-mppga-ink-muted">
                Last updated{" "}
                {new Date(contact.updatedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <Button type="submit">Save contact info</Button>
            </div>
          </form>
        ) : (
          <p className="px-6 py-8 text-sm text-mppga-ink-soft">
            site_settings row missing. Run the seed migration.
          </p>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  id,
  helper,
  children,
}: {
  label: string;
  id: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </span>
        {helper ? (
          <span className="mt-1 block text-xs text-mppga-ink-soft">
            {helper}
          </span>
        ) : null}
        <span className="mt-2 block">{children}</span>
      </label>
    </div>
  );
}
