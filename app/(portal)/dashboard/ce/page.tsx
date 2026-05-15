import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import {
  ceCredits,
  mockCertifications,
  mockMember,
} from "@/lib/mppga/portal/mockMember";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

export default function CEPage() {
  const progressPct = Math.min(
    100,
    Math.round(
      (mockMember.ceCreditsThisYear / mockMember.ceCreditsRequired) * 100,
    ),
  );

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="CE & certifications"
        actions={
          <Button variant="secondary" disabled>
            Upload certificate
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              CE hours · 2026
            </p>
            <p className="mt-2 font-serif text-4xl tracking-tight text-mppga-teal-deep">
              {mockMember.ceCreditsThisYear}
              <span className="text-mppga-ink-muted">
                /{mockMember.ceCreditsRequired}
              </span>
            </p>
          </div>
          <p className="text-sm text-mppga-ink-soft">
            {mockMember.ceCreditsRequired - mockMember.ceCreditsThisYear} hours to go
          </p>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-mppga-divider">
          <div
            className="h-full rounded-full bg-mppga-teal"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </Card>

      <Card title="Logged CE credits">
        {ceCredits.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
            No CE credits logged yet.
          </div>
        ) : (
          <ul className="divide-y divide-mppga-divider">
            {ceCredits.map((credit) => (
              <li
                key={credit.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-mppga-ink">
                    {credit.source}
                  </p>
                  <p className="mt-1 text-xs text-mppga-ink-muted">
                    {dateFmt.format(new Date(credit.earnedISO))}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-serif text-lg text-mppga-ink">
                    {credit.hours}h
                  </span>
                  <StatusBadge
                    label={credit.status}
                    tone={credit.status === "Approved" ? "teal" : "warn"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Certifications on file">
        {mockCertifications.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
            No certifications uploaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-mppga-divider">
            {mockCertifications.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-mppga-ink">
                    {cert.name}
                  </p>
                  <p className="mt-1 text-xs text-mppga-ink-muted">
                    {cert.issuer} · issued {dateFmt.format(new Date(cert.issuedISO))}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {cert.expiresISO ? (
                    <span className="text-mppga-ink-soft">
                      Expires {dateFmt.format(new Date(cert.expiresISO))}
                    </span>
                  ) : (
                    <StatusBadge label="No expiration" tone="neutral" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
