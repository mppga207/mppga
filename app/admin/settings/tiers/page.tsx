import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { TierConfigCard } from "@/components/mppga/admin/TierConfigCard";
import { loadAdminTiers } from "@/lib/admin/tiers-data";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "Tier configuration · Admin · MPPGA",
};

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminSettingsTiersPage({
  searchParams,
}: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const ok = readParam(sp.ok);
  const error = readParam(sp.error);
  const migrated = readParam(sp.migrated);
  const bootstrap = readParam(sp.bootstrap) === "1";

  const tiers = await loadAdminTiers();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Tier configuration"
        description="Pricing and benefit flags per tier. Dues edits create a new Stripe Price and migrate existing subscribers — they pay the new amount at their next renewal, no proration."
      />

      <SettingsTabs active="/admin/settings/tiers" />

      <Flash
        ok={ok}
        error={error}
        migrated={migrated}
        bootstrap={bootstrap}
      />

      {tiers.length === 0 ? (
        <Card>
          <p className="px-6 py-10 text-center text-sm text-mppga-ink-soft">
            No tiers seeded. Run the initial migration.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {tiers.map((tier) => (
            <TierConfigCard key={tier.id} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
}

function Flash({
  ok,
  error,
  migrated,
  bootstrap,
}: {
  ok: string | null;
  error: string | null;
  migrated: string | null;
  bootstrap: boolean;
}) {
  if (error) {
    const map: Record<string, string> = {
      invalid_amount: "Enter a non-negative whole-dollar amount.",
      invalid_input: "Some required fields were missing or invalid.",
      tier_not_found: "Tier no longer exists.",
      no_existing_price:
        "Bootstrap couldn’t reach Stripe. Check the STRIPE_SECRET_KEY env var.",
    };
    return (
      <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
        {map[error] ?? `Something went wrong: ${error}.`}
      </div>
    );
  }
  if (!ok) return null;
  const migratedNum = migrated ? Number(migrated) : 0;
  const message =
    ok === "dues_saved"
      ? bootstrap
        ? "Stripe Product and initial Price created. New signups will use this price."
        : migratedNum > 0
          ? `Dues updated. ${migratedNum} existing ${migratedNum === 1 ? "subscriber" : "subscribers"} will pay the new amount at their next renewal.`
          : "Dues updated. No existing subscribers to migrate."
      : ok === "no_change"
        ? "No change — the amount already matched."
        : ok === "metadata_saved"
          ? "Tier saved."
          : null;
  if (!message) return null;
  return (
    <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
      {message}
    </div>
  );
}
