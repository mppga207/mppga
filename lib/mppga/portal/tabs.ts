export type PortalTab = {
  href: string;
  label: string;
};

export const portalTabs: readonly PortalTab[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/directory", label: "Directory listing" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/billing", label: "Billing" },
] as const;
