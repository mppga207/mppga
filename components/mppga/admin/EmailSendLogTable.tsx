import type { AdminEmailLogEntry } from "@/lib/admin/emails-data";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_TONE: Record<AdminEmailLogEntry["status"], string> = {
  sent: "text-mppga-teal-deep",
  failed: "text-mppga-ink",
  bounced: "text-mppga-ink",
  skipped_disabled: "text-mppga-ink-muted",
};

const STATUS_LABEL: Record<AdminEmailLogEntry["status"], string> = {
  sent: "Sent",
  failed: "Failed",
  bounced: "Bounced",
  skipped_disabled: "Skipped (turned off)",
};

const TRIGGER_LABEL: Record<AdminEmailLogEntry["triggerType"], string> = {
  automated: "Scheduled",
  manual: "Sent by admin",
  webhook: "Triggered by payment",
};

export function EmailSendLogTable({
  entries,
  templateLabels = {},
}: {
  entries: AdminEmailLogEntry[];
  templateLabels?: Record<string, string>;
}) {
  if (entries.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-mppga-ink-soft">
        No sends recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
          <tr>
            <th className="px-6 py-3 font-medium">Sent</th>
            <th className="px-6 py-3 font-medium">Email</th>
            <th className="px-6 py-3 font-medium">Recipient</th>
            <th className="px-6 py-3 font-medium">Trigger</th>
            <th className="px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mppga-divider">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-mppga-page">
              <td className="px-6 py-3 text-xs text-mppga-ink-soft">
                {dateTimeFmt.format(new Date(entry.sentAt))}
              </td>
              <td className="px-6 py-3 text-mppga-ink">
                {templateLabels[entry.template] ?? entry.template}
              </td>
              <td className="px-6 py-3">
                {entry.profileName || entry.profileEmail ? (
                  <>
                    <p className="text-mppga-ink">
                      {entry.profileName ?? entry.profileEmail}
                    </p>
                    {entry.profileName && entry.profileEmail ? (
                      <p className="text-xs text-mppga-ink-muted">
                        {entry.profileEmail}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-mppga-ink-muted">Bulk</span>
                )}
              </td>
              <td className="px-6 py-3 text-xs text-mppga-ink-soft">
                {TRIGGER_LABEL[entry.triggerType] ?? entry.triggerType}
              </td>
              <td className="px-6 py-3">
                <span
                  className={`text-xs font-medium ${STATUS_TONE[entry.status]}`}
                >
                  {STATUS_LABEL[entry.status] ?? entry.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
