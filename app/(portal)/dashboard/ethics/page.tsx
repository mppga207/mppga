import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import { mockMember } from "@/lib/mppga/portal/mockMember";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function EthicsPage() {
  const signed = Boolean(mockMember.ethicsSignedAtISO);

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title="Code of ethics"
        actions={
          signed ? null : (
            <Button variant="primary" disabled>
              Review & sign
            </Button>
          )
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Your signature
            </p>
            <p className="mt-2 font-serif text-2xl text-mppga-ink">
              {signed ? "On file" : "Not signed yet"}
            </p>
            {signed && mockMember.ethicsSignedAtISO ? (
              <p className="mt-2 text-sm text-mppga-ink-soft">
                Signed {dateTimeFmt.format(new Date(mockMember.ethicsSignedAtISO))} · version {mockMember.ethicsVersion}
              </p>
            ) : (
              <p className="mt-2 text-sm text-mppga-ink-soft">
                Please review and sign the current version of the code of ethics to keep your membership in good standing.
              </p>
            )}
          </div>
          <StatusBadge
            label={signed ? "Up to date" : "Action needed"}
            tone={signed ? "teal" : "warn"}
          />
        </div>
      </Card>

      <Card title="The code">
        <div className="space-y-4 px-6 py-6 text-sm leading-relaxed text-mppga-ink-soft">
          <p>
            Members of the Maine Professional Pet Groomers Association commit to the welfare, comfort, and dignity of every animal in their care, and to honest, respectful conduct with clients, peers, and the public.
          </p>
          <p>
            We hold ourselves to current standards of safe handling, sanitation, and continuing education, and we welcome accountability when we fall short.
          </p>
        </div>
      </Card>
    </div>
  );
}
