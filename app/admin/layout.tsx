import type { ReactNode } from "react";
import { Nav } from "@/components/mppga/landing/Nav";
import { AdminTabs } from "@/components/mppga/admin/AdminTabs";
import { PortalSwitchLink } from "@/components/mppga/portal-switch-link";
import { PreviewModeBanner } from "@/components/mppga/portal/PreviewModeBanner";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <PreviewModeBanner />
      <AdminTabs extraRight={<PortalSwitchLink />} />
      <main className="mx-auto max-w-[1280px] px-6 py-10">{children}</main>
    </>
  );
}
