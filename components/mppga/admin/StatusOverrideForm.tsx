import { Button } from "@/components/mppga/ui/button";
import { overrideStatusAction } from "@/lib/admin/actions";
import type { MembershipStatus } from "@/types/database";

const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
  { value: "Awaiting_Payment", label: "Awaiting payment" },
  { value: "Active", label: "Active" },
  { value: "Grace_Period", label: "Grace period" },
  { value: "Lapsed", label: "Lapsed" },
  { value: "Suspended", label: "Suspended" },
  { value: "Honorary", label: "Honorary" },
];

export function StatusOverrideForm({
  profileId,
  currentStatus,
}: {
  profileId: string;
  currentStatus: MembershipStatus | null;
}) {
  return (
    <form action={overrideStatusAction} className="space-y-3 px-6 py-5">
      <input type="hidden" name="profile_id" value={profileId} />
      <div>
        <label
          htmlFor={`status-${profileId}`}
          className="block text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted"
        >
          New status
        </label>
        <select
          id={`status-${profileId}`}
          name="status"
          defaultValue={currentStatus ?? "Awaiting_Payment"}
          className="mt-1 h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={`reason-${profileId}`}
          className="block text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted"
        >
          Reason
        </label>
        <input
          id={`reason-${profileId}`}
          name="reason"
          type="text"
          required
          placeholder="Logged for the audit trail"
          className="mt-1 h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </div>
      <Button type="submit" variant="primary" className="w-full">
        Apply override
      </Button>
    </form>
  );
}
