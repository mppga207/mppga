import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import {
  type MembershipStatus,
  statusLabel,
} from "@/lib/mppga/portal/mockMember";

type Tone = "teal" | "neutral" | "warn" | "muted";

const toneByStatus: Record<MembershipStatus, Tone> = {
  Pending_Approval: "muted",
  Awaiting_Payment: "warn",
  Active: "teal",
  Grace_Period: "warn",
  Lapsed: "warn",
  Suspended: "muted",
  Honorary: "teal",
};

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return <StatusBadge label={statusLabel(status)} tone={toneByStatus[status]} />;
}
