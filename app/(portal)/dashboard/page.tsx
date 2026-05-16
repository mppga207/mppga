import Link from "next/link";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { PortalPageHeader } from "@/components/mppga/portal/PortalPageHeader";
import {
  MembershipBadge,
  statusLabel,
} from "@/components/mppga/portal/MembershipBadge";
import { requireSession } from "@/lib/supabase/session";
import {
  loadDirectoryListing,
  loadMemberOverview,
  loadMemberRegistrations,
} from "@/lib/mppga/portal/data";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default async function DashboardOverviewPage() {
  const session = await requireSession("/dashboard");
  const [member, listing, registrations] = await Promise.all([
    loadMemberOverview(session),
    loadDirectoryListing(session),
    loadMemberRegistrations(session),
  ]);

  const now = Date.now();
  const upcoming = registrations
    .filter((r) => r.registrationStatus !== "cancelled")
    .filter((r) => new Date(r.eventDateISO).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.eventDateISO).getTime() - new Date(b.eventDateISO).getTime(),
    )
    .slice(0, 3);

  const displayName = member.fullName || member.email;
  const firstName = displayName.split(" ")[0] ?? displayName;
  const listingCity = listing
    ? `${listing.city}, ${listing.state}`
    : null;
  const listingLive = listing?.isVisible ?? false;
  const showRenewBanner =
    member.status === "Grace_Period" || member.status === "Lapsed";

  return (
    <div className="space-y-10">
      <PortalPageHeader
        title={`Welcome back, ${firstName}`}
        actions={
          <Button href="/dashboard/billing" variant="secondary">
            Manage membership
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Membership
          </p>
          <div className="mt-3">
            <MembershipBadge status={member.status} />
          </div>
          <p className="mt-3 text-sm text-mppga-ink-soft">
            {member.tierName ?? "Tier not assigned"}
            {member.expiresAt ? (
              <>
                {" "}
                · renews {dateFmt.format(new Date(member.expiresAt))}
              </>
            ) : null}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Directory listing
          </p>
          <p className="mt-3 font-serif text-xl text-mppga-ink">
            {listing ? (listingLive ? "Live" : "Hidden") : "Not set up"}
          </p>
          <p className="mt-2 text-xs text-mppga-ink-soft">
            {listingCity ?? "Add your business location"}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Upcoming events
          </p>
          <p className="mt-3 font-serif text-3xl tracking-tight text-mppga-teal-deep">
            {upcoming.length}
          </p>
          <p className="mt-2 text-xs text-mppga-ink-soft">
            registered for the months ahead
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Upcoming events" className="lg:col-span-2">
          {upcoming.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
              No upcoming events. Browse the calendar to find one.
            </div>
          ) : (
            <ul className="divide-y divide-mppga-divider">
              {upcoming.map((reg) => (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                >
                  <div>
                    <p className="font-serif text-lg text-mppga-ink">
                      {reg.eventTitle}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-mppga-ink-soft">
                      <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                      {dateFmt.format(new Date(reg.eventDateISO))}
                      <span className="text-mppga-ink-muted">·</span>
                      <MapPin className="h-4 w-4" strokeWidth={1.8} />
                      {reg.location}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {reg.registrationStatus === "waitlisted" ? (
                      <p className="text-mppga-ink-soft">
                        Waitlist · #{reg.waitlistPosition}
                      </p>
                    ) : (
                      <p className="text-mppga-teal-deep">Confirmed</p>
                    )}
                    <Link
                      href="/dashboard/events"
                      className="text-mppga-teal hover:text-mppga-teal-hover"
                    >
                      View details
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quick actions">
          <div className="space-y-1 px-2 py-2">
            <QuickLink
              href="/dashboard/profile"
              icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.8} />}
              label="Update your profile"
              note="Keep your contact info current"
            />
            <QuickLink
              href="/dashboard/directory"
              icon={<MapPin className="h-4 w-4" strokeWidth={1.8} />}
              label="Edit directory listing"
              note="What the public sees"
            />
            <QuickLink
              href="/events"
              icon={<CalendarDays className="h-4 w-4" strokeWidth={1.8} />}
              label="Browse events"
              note="See what's coming up"
            />
          </div>
        </Card>
      </div>

      {showRenewBanner ? (
        <Card className="border-mppga-sand-deep bg-mppga-sand p-6">
          <p className="font-serif text-lg text-mppga-ink">
            Your membership is in {statusLabel(member.status).toLowerCase()}.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mppga-ink-soft">
            Renew today to keep your directory listing live and your member event pricing intact.
          </p>
          <div className="mt-4">
            <Button href="/renew" variant="primary">
              Renew now
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-md px-4 py-3 transition-colors hover:bg-mppga-page"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-mppga-ink">{label}</span>
        <span className="block text-xs text-mppga-ink-soft">{note}</span>
      </span>
    </Link>
  );
}
