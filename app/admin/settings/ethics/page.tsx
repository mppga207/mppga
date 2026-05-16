import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { loadEthicsSignatures } from "@/lib/admin/settings-data";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata = {
  title: "Code of ethics · Admin · MPPGA",
};

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminSettingsEthicsPage() {
  await requireAdmin();
  const signatures = await loadEthicsSignatures();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Code of ethics"
        description="Append-only audit of every signature. Each entry records the document version, a SHA-256 of the text the signer actually saw, and the IP they signed from."
      />

      <SettingsTabs active="/admin/settings/ethics" />

      <Card title="Signatures">
        {signatures.length === 0 ? (
          <p className="px-6 py-8 text-sm text-mppga-ink-soft">
            No ethics signatures yet. Members sign when they enroll once
            the member-portal ethics tab is enabled (deferred to Phase 2
            per CLAUDE.md §1).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Signer</th>
                  <th className="px-6 py-3 font-medium">Signed</th>
                  <th className="px-6 py-3 font-medium">Version</th>
                  <th className="px-6 py-3 font-medium">Document hash</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mppga-divider">
                {signatures.map((sig) => (
                  <tr key={sig.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-mppga-ink">
                        {sig.signerName}
                      </p>
                      <p className="text-xs text-mppga-ink-muted">
                        {sig.signerEmail}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-xs text-mppga-ink-soft">
                      {dateTimeFmt.format(new Date(sig.signedAt))}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-mppga-ink">
                      {sig.documentVersion}
                    </td>
                    <td className="px-6 py-3 font-mono text-[11px] text-mppga-ink-muted">
                      {sig.documentHash.slice(0, 12)}…
                    </td>
                    <td className="px-6 py-3 font-mono text-[11px] text-mppga-ink-soft">
                      {sig.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Current ethics document"
        description="Drafting and version history live with the Content tab (Track 6 follow-up). Signatures recorded above always reference the version the signer actually saw, by SHA-256 hash."
      >
        <p className="px-6 py-8 text-sm text-mppga-ink-soft">
          Document editing isn’t wired yet. For now, the ethics text is
          managed in code — see <code className="font-mono">CLAUDE.md</code>{" "}
          §1 for deferral notes.
        </p>
      </Card>
    </div>
  );
}
