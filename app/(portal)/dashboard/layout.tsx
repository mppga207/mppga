import type { ReactNode } from "react";
import { Nav } from "@/components/mppga/landing/Nav";
import { PortalTabs } from "@/components/mppga/portal/PortalTabs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <PortalTabs />
      <main className="mx-auto max-w-[1140px] px-6 py-10">{children}</main>
    </>
  );
}
