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
      <div className="mx-auto max-w-[1280px]">
        <nav
          aria-label="Admin sections"
          className="flex gap-7 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
