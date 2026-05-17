import Link from "next/link";

import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/settings", label: "Branding" },
  { href: "/admin/settings/contact", label: "Contact" },
  { href: "/admin/settings/tiers", label: "Tiers" },
  { href: "/admin/settings/board", label: "Board roster" },
  { href: "/admin/settings/ethics", label: "Code of ethics" },
] as const;

export function SettingsTabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Settings sections"
      className="-mb-px flex touch-pan-x gap-1 overflow-x-auto border-b border-mppga-divider [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-mppga-teal text-mppga-teal-deep"
                : "border-transparent text-mppga-ink-soft hover:text-mppga-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
