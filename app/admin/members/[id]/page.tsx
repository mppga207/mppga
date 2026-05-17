import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { MembershipBadge } from "@/components/mppga/portal/MembershipBadge";
import { StatusOverrideForm } from "@/components/mppga/admin/StatusOverrideForm";
import { ResendWelcomeForm } from "@/components/mppga/admin/ResendWelcomeForm";
import { CopyButton } from "@/components/mppga/admin/CopyButton";
import { loadMemberDetail } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const okMessage = readParam(sp.ok);
  const errorMessage = readParam(sp.error);

  const member = await loadMemberDetail(id);
  if (!member) notFound();

  const flash = bannerFor(okMessage, errorMessage);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to members
        </Link>
      </div>

      <AdminPageHeader
        title={member.fullName}
        description={member.email}
        actions={
          member.membershipStatus ? (
            <MembershipBadge status={member.membershipStatus} />
          ) : null
        }
      />

      {flash ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            flash.tone === "ok"
              ? "border-mppga-teal bg-mppga-teal-tint text-mppga-teal-deep"
              : "border-mppga-sand-deep bg-mppga-sand text-mppga-ink"
          }`}
        >
          {flash.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card title="Profile">
            <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
              <DetailItem label="Full name" value={member.fullName} />
              <DetailItem label="Email" value={member.email} />
              <DetailItem label="Phone" value={member.phone ?? "-"} />
              <DetailItem
                label="Organization"
                value={member.organizationName ?? "-"}
              />
              <DetailItem label="Role" value={member.role} />
              <DetailItem
                label="Member since"
                value={
                  member.createdAt
                    ? dateFmt.format(new Date(member.createdAt))
                    : "-"
                }
              />
            </dl>
          </Card>

          <Card title="Billing">
            <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
              <DetailItem label="Tier" value={member.tierName ?? "-"} />
              <DetailItem
                label="Expires"
                value={
                  member.expiresAt
                    ? dateFmt.format(new Date(member.expiresAt))
                    : "-"
                }
              />
              <DetailItem
                label="Billing status"
                value={member.billingStatus ?? "-"}
              />
              <DetailItem
                label="Stripe subscription"
                value={member.stripeSubscriptionId ?? "-"}
              />
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
                  Stripe customer
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-mppga-ink">
                    {member.stripeCustomerId ?? "-"}
                  </span>
                  {member.stripeCustomerId ? (
                    <CopyButton value={member.stripeCustomerId}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Copy
                    </CopyButton>
                  ) : null}
                  {member.stripeCustomerId ? (
                    <a
                      href={`https://dashboard.stripe.com/customers/${member.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-mppga-teal hover:text-mppga-teal-hover"
                    >
                      Open in Stripe
                      <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                    </a>
                  ) : null}
                </div>
              </div>
            </dl>
          </Card>

          <Card title="Event registrations">
            {member.registrations.length === 0 ? (
              <p className="px-6 py-8 text-sm text-mppga-ink-soft">
                No registrations on record.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Event</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mppga-divider">
                  {member.registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td className="px-6 py-3">
                        <p className="font-medium text-mppga-ink">
                          {reg.eventTitle}
                        </p>
                        <p className="text-xs text-mppga-ink-muted">
                          {reg.eventDate
                            ? dateFmt.format(new Date(reg.eventDate))
                            : ""}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-mppga-ink-soft">
                        {reg.status}
                        {reg.waitlistPosition
                          ? ` · #${reg.waitlistPosition}`
                          : ""}
                      </td>
                      <td className="px-6 py-3 text-mppga-ink-soft">
                        {reg.paymentStatus}
                      </td>
                      <td className="px-6 py-3 text-mppga-ink-soft">
                        {reg.pricingTier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Admin audit">
            {member.auditEntries.length === 0 ? (
              <p className="px-6 py-8 text-sm text-mppga-ink-soft">
                No admin actions recorded for this member.
              </p>
            ) : (
              <ul className="divide-y divide-mppga-divider">
                {member.auditEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="space-y-1 px-6 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-mppga-ink">
                        {entry.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-mppga-ink-muted">
                        {dateTimeFmt.format(new Date(entry.createdAt))}
                      </p>
                    </div>
                    <p className="text-xs text-mppga-ink-soft">
                      By {entry.actorName ?? "system"}
                    </p>
                    {entry.payload &&
                    typeof entry.payload === "object" &&
                    Object.keys(entry.payload as Record<string, unknown>).length >
                      0 ? (
                      <pre className="overflow-x-auto rounded-md bg-mppga-page px-3 py-2 font-mono text-[11px] text-mppga-ink-soft">
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Status override">
            <StatusOverrideForm
              profileId={member.profileId}
              currentStatus={member.membershipStatus}
            />
          </Card>
          <Card title="Resend welcome">
            <div className="px-6 py-5">
              <p className="mb-3 text-xs text-mppga-ink-soft">
                Fires a fresh welcome email. Logged in the audit trail.
              </p>
              <ResendWelcomeForm profileId={member.profileId} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-mppga-ink">{value}</dd>
    </div>
  );
}

function bannerFor(
  okMessage: string | null,
  errorMessage: string | null,
): { tone: "ok" | "error"; message: string } | null {
  if (errorMessage) {
    return {
      tone: "error",
      message: `Something went wrong: ${errorMessage}.`,
    };
  }
  switch (okMessage) {
    case "status":
      return { tone: "ok", message: "Status updated." };
    case "welcome_resent":
      return { tone: "ok", message: "Welcome email queued." };
    default:
      return null;
  }
}
