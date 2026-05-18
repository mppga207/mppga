"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { portalTabs } from "@/lib/mppga/portal/tabs";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalTabs({ extraRight }: { extraRight?: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="border-b border-mppga-divider bg-mppga-page">
      <div className="mx-auto flex max-w-[1140px] items-center gap-4 px-6">
        <nav
          aria-label="Dashboard sections"
          className="flex flex-1 gap-7 touch-pan-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        {extraRight ? <div className="shrink-0">{extraRight}</div> : null}
      </div>
    </div>
  );
}
