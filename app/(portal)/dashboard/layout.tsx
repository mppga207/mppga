import type { ReactNode } from "react";
import { Nav } from "@/components/mppga/landing/Nav";
import { PortalTabs } from "@/components/mppga/portal/PortalTabs";
import { PreviewModeBanner } from "@/components/mppga/portal/PreviewModeBanner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <PreviewModeBanner />
      <PortalTabs />
      <main className="mx-auto max-w-[1140px] px-6 py-10">{children}</main>
    </>
  );
}
