export type PortalTab = {
  href: string;
  label: string;
};

export const portalTabs: readonly PortalTab[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/directory", label: "Directory listing" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/ce", label: "CE & certifications" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/ethics", label: "Code of ethics" },
] as const;
