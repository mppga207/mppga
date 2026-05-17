import Link from "next/link";
import { Search } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { MembershipBadge } from "@/components/mppga/portal/MembershipBadge";
import { MembersExportButton } from "@/components/mppga/admin/MembersExportButton";
import { loadMembersTable, loadTierOptions } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/supabase/session";
import type { MembershipStatus } from "@/types/database";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const STATUS_VALUES: MembershipStatus[] = [
  "Awaiting_Payment",
  "Active",
  "Grace_Period",
  "Lapsed",
  "Suspended",
  "Honorary",
];

const STATUS_LABELS: Record<MembershipStatus, string> = {
  Awaiting_Payment: "Awaiting payment",
  Active: "Active",
  Grace_Period: "Grace period",
  Lapsed: "Lapsed",
  Suspended: "Suspended",
  Honorary: "Honorary",
};

function readMulti(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function AdminMembersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const selectedStatuses = readMulti(sp.status).filter((s): s is MembershipStatus =>
    (STATUS_VALUES as string[]).includes(s),
  );

  const [members, tiers] = await Promise.all([
    loadMembersTable({
      search: search.trim() || undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    }),
    loadTierOptions(),
  ]);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Members"
        description="Search, filter, and act on every member."
        actions={<MembersExportButton />}
      />

      <Card>
        <form
          method="get"
          className="space-y-4 border-b border-mppga-divider px-6 py-5"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mppga-ink-muted"
              strokeWidth={1.8}
            />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search by name or email"
              className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page pl-10 pr-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Status
            </p>
            {STATUS_VALUES.map((value) => {
              const checked = selectedStatuses.includes(value);
              return (
                <label
                  key={value}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                    checked
                      ? "border-mppga-teal bg-mppga-teal-tint text-mppga-teal-deep"
                      : "border-mppga-divider bg-mppga-page text-mppga-ink-soft hover:border-mppga-teal/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="status"
                    value={value}
                    defaultChecked={checked}
                    className="sr-only"
                  />
                  {STATUS_LABELS[value]}
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-mppga-ink-muted">
              {members.length} {members.length === 1 ? "member" : "members"}{" "}
              · {tiers.length} {tiers.length === 1 ? "tier" : "tiers"}{" "}
              configured
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/members"
                className="text-xs text-mppga-ink-soft hover:text-mppga-teal"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="rounded-md bg-mppga-teal px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-mppga-teal-hover"
              >
                Apply filters
              </button>
            </div>
          </div>
        </form>

        {members.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-mppga-ink-soft">
              No members match the current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: a wide-screen table. Hidden on narrow viewports
                so we never need horizontal scroll. */}
            <div className="hidden lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Tier</th>
                    <th className="px-6 py-3 font-medium">Expires</th>
                    <th className="px-6 py-3 font-medium">Organization</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-mppga-divider">
                  {members.map((row) => (
                    <tr key={row.profileId} className="hover:bg-mppga-page">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/members/${row.profileId}`}
                          className="font-medium text-mppga-ink hover:text-mppga-teal"
                        >
                          {row.fullName}
                        </Link>
                        <p className="text-xs text-mppga-ink-muted">
                          {row.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {row.membershipStatus ? (
                          <MembershipBadge status={row.membershipStatus} />
                        ) : (
                          <span className="text-xs text-mppga-ink-muted">
                            No membership
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-mppga-ink-soft">
                        {row.tierName ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-mppga-ink-soft">
                        {row.expiresAt
                          ? dateFormatter.format(new Date(row.expiresAt))
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-mppga-ink-soft">
                        {row.organizationName ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/members/${row.profileId}`}
                          className="text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile + tablet: stacked cards, one per member. Matches
                admin-portal.md §3 ("table becomes a stacked card list"). */}
            <ul className="divide-y divide-mppga-divider lg:hidden">
              {members.map((row) => (
                <li key={row.profileId}>
                  <Link
                    href={`/admin/members/${row.profileId}`}
                    className="block px-5 py-4 transition-colors hover:bg-mppga-page focus-visible:bg-mppga-page focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-mppga-ink">
                          {row.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-mppga-ink-muted">
                          {row.email}
                        </p>
                      </div>
                      {row.membershipStatus ? (
                        <MembershipBadge status={row.membershipStatus} />
                      ) : (
                        <span className="shrink-0 text-xs text-mppga-ink-muted">
                          No membership
                        </span>
                      )}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="text-mppga-ink-muted">Tier</dt>
                        <dd className="mt-0.5 text-mppga-ink-soft">
                          {row.tierName ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-mppga-ink-muted">Renews</dt>
                        <dd className="mt-0.5 text-mppga-ink-soft">
                          {row.expiresAt
                            ? dateFormatter.format(new Date(row.expiresAt))
                            : "—"}
                        </dd>
                      </div>
                      {row.organizationName ? (
                        <div className="col-span-2">
                          <dt className="text-mppga-ink-muted">Organization</dt>
                          <dd className="mt-0.5 text-mppga-ink-soft">
                            {row.organizationName}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
