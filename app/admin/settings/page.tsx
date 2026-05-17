import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { LogoUploader } from "@/components/mppga/admin/LogoUploader";
import { loadSiteLogo } from "@/lib/admin/branding-data";
import { requireAdmin } from "@/lib/supabase/session";

type Swatch = {
  label: string;
  hex: string;
  className: string;
};

const swatches: readonly Swatch[] = [
  { label: "Teal (primary)", hex: "#477376", className: "bg-mppga-teal" },
  { label: "Page", hex: "#fafaf7", className: "bg-mppga-page border border-mppga-divider" },
  { label: "Ink", hex: "#1a1a1a", className: "bg-mppga-ink" },
  { label: "Divider", hex: "#e5e5e0", className: "bg-mppga-divider" },
] as const;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const ok = readParam(sp.ok);
  const error = readParam(sp.error);
  const logo = await loadSiteLogo();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Settings"
        description="Branding, mission, and the public-facing details that travel across the site and emails."
      />

      <SettingsTabs active="/admin/settings" />

      <Flash ok={ok} error={error} />

      <Card
        title="Branding"
        description="Logo, colors, and typography that travel across the site and emails."
      >
        <div className="space-y-8 px-6 py-6">
          <LogoUploader logoUrl={logo.logoUrl} />

          <section>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Color palette
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {swatches.map((swatch) => (
                <div
                  key={swatch.label}
                  className="flex items-center gap-3 rounded-md border border-mppga-divider px-4 py-3"
                >
                  <span
                    aria-hidden
                    className={`h-9 w-9 rounded ${swatch.className}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-mppga-ink">
                      {swatch.label}
                    </p>
                    <p className="font-mono text-xs text-mppga-ink-muted">
                      {swatch.hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-mppga-ink-muted">
              These colors apply across the site and email templates. Adjusting
              them from this screen is on the roadmap.
            </p>
          </section>
        </div>
      </Card>

      <Card
        title="Mission statement"
        description="Shown on the Home page and in the welcome email."
      >
        <div className="px-6 py-6 text-sm text-mppga-ink-soft">
          Edit the home-page hero copy from the{" "}
          <a
            href="/admin/content"
            className="text-mppga-teal hover:text-mppga-teal-hover"
          >
            Content tab
          </a>
          .
        </div>
      </Card>
    </div>
  );
}

function Flash({
  ok,
  error,
}: {
  ok: string | null;
  error: string | null;
}) {
  if (error) {
    const map: Record<string, string> = {
      no_file: "Pick an image file first.",
      invalid_type: "Use a PNG, JPG, SVG, or WebP image.",
      too_large: "Image is larger than 2 MB.",
    };
    return (
      <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
        {map[error] ?? `Something went wrong: ${error}.`}
      </div>
    );
  }
  if (!ok) return null;
  const message =
    ok === "logo_uploaded"
      ? "Logo uploaded. It now appears in the header and emails."
      : ok === "logo_removed"
        ? "Logo removed. Falling back to the placeholder mark."
        : null;
  if (!message) return null;
  return (
    <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
      {message}
    </div>
  );
}
