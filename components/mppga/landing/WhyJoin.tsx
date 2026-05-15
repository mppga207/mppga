import { ButtonLink } from "@/components/mppga/ui/button";

const benefits: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Statewide directory listing",
    body: "Pet owners across Maine find your business by location and the services you offer.",
  },
  {
    title: "Continuing education credits",
    body: "Track your CE hours and access member-only workshops and certifications.",
  },
  {
    title: "Member event pricing",
    body: "Discounted rates on every MPPGA workshop, clinic, and the annual meeting.",
  },
  {
    title: "Voting rights",
    body: "Professional members elect the board and shape the direction of the association.",
  },
  {
    title: "Code of ethics",
    body: "Show pet owners and peers that you have signed on to a shared standard of care.",
  },
  {
    title: "Peer community",
    body: "A private space to share work, ask questions, and learn from groomers across the state.",
  },
];

export function WhyJoin() {
  return (
    <section className="border-b border-mppga-divider">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
          Why join
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl text-mppga-ink">
          Membership built around the day-to-day work.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-lg border border-mppga-divider bg-mppga-card p-6"
            >
              <h3 className="font-serif text-lg text-mppga-ink">{b.title}</h3>
              <p className="mt-2 text-sm text-mppga-ink-soft">{b.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <ButtonLink href="/join" variant="primary" size="lg">
            See membership tiers
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
