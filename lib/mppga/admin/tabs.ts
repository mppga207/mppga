export type AdminTab = {
  href: string;
  label: string;
};

export const adminTabs: readonly AdminTab[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/settings", label: "Settings" },
] as const;
