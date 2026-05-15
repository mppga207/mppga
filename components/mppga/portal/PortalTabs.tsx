"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalTabs } from "@/lib/mppga/portal/tabs";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-mppga-divider bg-mppga-page">
      <div className="mx-auto max-w-[1140px] px-6">
        <div className="md:hidden">
          <label className="sr-only" htmlFor="portal-tab-select">
            Dashboard section
          </label>
          <select
            id="portal-tab-select"
            value={portalTabs.find((t) => isActive(pathname, t.href))?.href ?? "/dashboard"}
            onChange={(e) => {
              window.location.href = e.target.value;
            }}
            className="my-3 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink"
          >
            {portalTabs.map((tab) => (
              <option key={tab.href} value={tab.href}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        <nav
          aria-label="Dashboard sections"
          className="hidden gap-8 overflow-x-auto md:flex"
        >
          {portalTabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap py-4 text-sm transition-colors",
                  active
                    ? "font-medium text-mppga-teal"
                    : "text-mppga-ink-soft hover:text-mppga-ink",
                )}
              >
                {tab.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-mppga-teal"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
