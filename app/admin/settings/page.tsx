import { Upload } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { Button } from "@/components/mppga/ui/button";
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

export default async function AdminSettingsPage() {
  await requireAdmin();
  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Settings"
        description="Branding, mission, and the public-facing details that travel across the site and emails."
      />

      <SettingsTabs active="/admin/settings" />

      <Card
        title="Branding"
        description="Logo, colors, and typography that travel across the site and emails."
      >
        <div className="space-y-8 px-6 py-6">
          <section>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Logo
            </p>
            <div className="mt-3 flex items-center gap-5 rounded-md border border-dashed border-mppga-divider p-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-mppga-teal font-serif text-3xl text-white">
                M
              </div>
              <div className="flex-1">
                <p className="font-medium text-mppga-ink">Placeholder mark</p>
                <p className="mt-1 text-sm text-mppga-ink-soft">
                  PNG / SVG recommended &middot; transparent background
                </p>
              </div>
              <Button variant="secondary" disabled>
                <Upload className="h-4 w-4" strokeWidth={1.8} />
                Upload
              </Button>
            </div>
          </section>

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
          </section>
        </div>
      </Card>

      <Card
        title="Mission statement"
        description="Shown on the Home page and in the welcome email. Keep it under two sentences."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          Not set.
        </div>
      </Card>

      <Card
        title="Social channels"
        description="Public links shown in the footer and on the Contact page."
      >
        <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          No channels added yet.
        </div>
      </Card>
    </div>
  );
}
