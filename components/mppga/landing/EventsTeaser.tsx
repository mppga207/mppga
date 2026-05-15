import Link from "next/link";
import { ButtonLink } from "@/components/mppga/ui/button";

export function EventsTeaser() {
  return (
    <section className="border-b border-mppga-divider bg-mppga-sand">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Upcoming events
            </p>
            <h2 className="mt-4 font-serif text-3xl text-mppga-ink">
              Workshops, clinics, and the annual meeting.
            </h2>
          </div>
          <Link
            href="/events"
            className="text-sm font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            See all events →
          </Link>
        </div>
        <div className="mt-10 rounded-lg border border-mppga-divider bg-mppga-card p-10 text-center">
          <p className="font-serif text-xl text-mppga-ink">
            Our next event is being scheduled.
          </p>
          <p className="mx-auto mt-3 max-w-md text-mppga-ink-soft">
            Check back soon, or join the association to get invitations as soon
            as they are announced.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/events" variant="secondary" size="md">
              View events page
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
