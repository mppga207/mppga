import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import type { MembershipStatus } from "@/types/database";

type Tone = "teal" | "neutral" | "warn" | "muted";

const toneByStatus: Record<MembershipStatus, Tone> = {
  Awaiting_Payment: "warn",
  Active: "teal",
  Grace_Period: "warn",
  Lapsed: "warn",
  Suspended: "muted",
  Honorary: "teal",
};

export function statusLabel(status: MembershipStatus): string {
  return status.replace(/_/g, " ");
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return <StatusBadge label={statusLabel(status)} tone={toneByStatus[status]} />;
}
