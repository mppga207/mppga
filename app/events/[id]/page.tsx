import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import { mockEvents, type MockEvent } from "@/lib/mppga/admin/mockEvents";

type PageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function formatTimeRange(start: Date, end?: Date): string {
  if (!end) return timeFormatter.format(start);
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

export function generateStaticParams() {
  return mockEvents
    .filter((e) => e.status === "Published")
    .map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event) return { title: "Event not found · MPPGA" };
  return {
    title: `${event.title} · MPPGA`,
    description: event.description,
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = mockEvents.find((e) => e.id === id);
  if (!event || event.status !== "Published") {
    notFound();
  }

  return <EventDetail event={event} />;
}

function EventDetail({ event }: { event: MockEvent }) {
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : undefined;
  const spotsLeft = event.capacity - event.rsvps;
  const fillPct = Math.min(100, Math.round((event.rsvps / event.capacity) * 100));
  const isFull = spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main className="mx-auto max-w-[1140px] px-6 pb-20 pt-10">
        <nav className="mb-8 text-sm text-mppga-ink-muted" aria-label="Breadcrumb">
          <Link
            href="/events"
            className="transition-colors hover:text-mppga-teal"
          >
            Events
          </Link>
          <span className="mx-2">/</span>
          <span className="text-mppga-ink-soft">{event.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <article>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              {event.location.split(",")[0]} workshop
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-mppga-ink">
              {event.title}
            </h1>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                icon={<Calendar className="h-4 w-4" strokeWidth={1.8} />}
                label="Date"
                value={dateFormatter.format(start)}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" strokeWidth={1.8} />}
                label="Time"
                value={formatTimeRange(start, end)}
              />
              <DetailRow
                icon={<MapPin className="h-4 w-4" strokeWidth={1.8} />}
                label="Location"
                value={event.location}
              />
              <DetailRow
                icon={<Users className="h-4 w-4" strokeWidth={1.8} />}
                label="Capacity"
                value={`${event.rsvps} of ${event.capacity} registered`}
              />
            </dl>

            <section className="mt-10 border-t border-mppga-divider pt-8">
              <h2 className="font-serif text-2xl text-mppga-ink">About this event</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-mppga-ink-soft">
                {event.description}
              </p>
            </section>

            <section className="mt-10 border-t border-mppga-divider pt-8">
              <h2 className="font-serif text-2xl text-mppga-ink">What to bring</h2>
              <ul className="mt-4 space-y-2 text-sm text-mppga-ink-soft">
                <li>· A notepad — we&rsquo;ll cover a lot</li>
                <li>· Your own scissors if you have a favorite pair</li>
                <li>· Lunch is provided for full-day events</li>
              </ul>
              <p className="mt-4 text-xs italic text-mppga-ink-muted">
                Detailed agenda and what-to-bring list will be sent to all
                registered attendees one week before the event.
              </p>
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-mppga-divider bg-mppga-card p-6">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
                Reserve your spot
              </p>

              <div className="mt-5 space-y-4">
                <PriceRow
                  label="Member price"
                  price={formatPrice(event.memberPrice)}
                  highlight
                />
                <PriceRow
                  label="Guest price"
                  price={formatPrice(event.guestPrice)}
                />
              </div>

              <div className="mt-6 border-t border-mppga-divider pt-5">
                <div className="flex items-center justify-between text-xs text-mppga-ink-soft">
                  <span>{event.rsvps} registered</span>
                  <span>{spotsLeft > 0 ? `${spotsLeft} left` : "Full"}</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-mppga-divider"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-mppga-teal"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {isFull ? (
                  <Button size="lg" className="w-full" variant="secondary">
                    Join the waitlist
                  </Button>
                ) : (
                  <Button size="lg" className="w-full">
                    Reserve your spot
                  </Button>
                )}
                <p className="text-center text-xs text-mppga-ink-muted">
                  <Link href="/dashboard" className="hover:text-mppga-teal">
                    Sign in
                  </Link>{" "}
                  for member pricing, or{" "}
                  <Link href="/join" className="hover:text-mppga-teal">
                    join MPPGA
                  </Link>
                  .
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-md border border-mppga-divider bg-mppga-page p-4 text-[11px] leading-relaxed text-mppga-ink-muted">
              Refunds available up to 7 days before the event. After that,
              registration is transferable to another groomer at your shop.
            </p>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-mppga-divider bg-mppga-card p-4">
      <span className="mt-0.5 text-mppga-teal">{icon}</span>
      <div>
        <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-mppga-ink">{value}</dd>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  price,
  highlight = false,
}: {
  label: string;
  price: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between rounded-md px-3 py-2 ${
        highlight ? "bg-mppga-teal-tint" : ""
      }`}
    >
      <span
        className={`text-sm ${
          highlight ? "font-medium text-mppga-teal-deep" : "text-mppga-ink-soft"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-serif text-xl ${
          highlight ? "text-mppga-teal-deep" : "text-mppga-ink"
        }`}
      >
        {price}
      </span>
    </div>
  );
}
