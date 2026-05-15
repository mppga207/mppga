"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminTabs } from "@/lib/mppga/admin/tabs";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-mppga-divider bg-mppga-page">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="md:hidden">
          <label className="sr-only" htmlFor="admin-tab-select">
            Admin section
          </label>
          <select
            id="admin-tab-select"
            value={adminTabs.find((t) => isActive(pathname, t.href))?.href ?? "/admin"}
            onChange={(e) => {
              window.location.href = e.target.value;
            }}
            className="my-3 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink"
          >
            {adminTabs.map((tab) => (
              <option key={tab.href} value={tab.href}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        <nav
          aria-label="Admin sections"
          className="hidden gap-8 overflow-x-auto md:flex"
        >
          {adminTabs.map((tab) => {
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
