import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getSession } from "@/lib/supabase/session";

/**
 * Right-aligned "View member portal" chip rendered in the admin tabs
 * strip. Only shows when the admin has set up their own member
 * profile (Honorary / Active / Grace_Period) — otherwise the
 * middleware would bounce them right back to /admin and the link
 * would feel broken.
 */
export async function PortalSwitchLink() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin") return null;
  const status = session.membershipStatus;
  if (status !== "Active" && status !== "Honorary" && status !== "Grace_Period") {
    return null;
  }

  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-mppga-divider px-3 py-1.5 text-xs font-medium text-mppga-ink-soft transition-colors hover:border-mppga-teal hover:text-mppga-teal"
    >
      Member portal
      <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
    </Link>
  );
}

/**
 * Right-aligned "View admin portal" chip rendered in the member-
 * portal tabs strip. Only shows for users with role=admin.
 */
export async function AdminSwitchLink() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin") return null;

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-mppga-divider px-3 py-1.5 text-xs font-medium text-mppga-ink-soft transition-colors hover:border-mppga-teal hover:text-mppga-teal"
    >
      Admin portal
      <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
    </Link>
  );
}
