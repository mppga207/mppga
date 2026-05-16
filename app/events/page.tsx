import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { PublicEventCard } from "@/components/mppga/events/PublicEventCard";
import { mockEvents } from "@/lib/mppga/admin/mockEvents";

export const metadata = {
  title: "Events · MPPGA",
  description:
    "Workshops, clinics, and mixers from the Maine Professional Pet Groomers Association.",
};

export default function EventsPage() {
  const now = Date.now();
  const published = mockEvents.filter((e) => e.status === "Published");
  const upcoming = published
    .filter((e) => new Date(e.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = published
    .filter((e) => new Date(e.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main className="mx-auto max-w-[1140px] px-6 pb-20 pt-12">
        <header className="mb-12 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
            Events
          </p>
          <h1 className="mt-2 font-serif text-4xl text-mppga-ink">
            Learn, practice, and connect
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
            Workshops, hands-on clinics, and mixers across Maine. Members get
            discounted pricing on every event. Guests are welcome too.
          </p>
        </header>

        <section aria-labelledby="upcoming-heading">
          <div className="mb-6 flex items-baseline justify-between">
            <h2
              id="upcoming-heading"
              className="font-serif text-2xl text-mppga-ink"
            >
              Upcoming
            </h2>
            <p className="text-xs text-mppga-ink-muted">
              {upcoming.length}{" "}
              {upcoming.length === 1 ? "event" : "events"} scheduled
            </p>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming events right now. Check back soon — new ones are added throughout the year." />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {upcoming.map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 ? (
          <section aria-labelledby="past-heading" className="mt-16">
            <h2
              id="past-heading"
              className="mb-6 font-serif text-2xl text-mppga-ink"
            >
              Past events
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {past.map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-mppga-divider bg-mppga-card p-10 text-center">
      <p className="text-sm text-mppga-ink-soft">{message}</p>
    </div>
  );
}
