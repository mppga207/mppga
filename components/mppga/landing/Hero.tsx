import { ButtonLink } from "@/components/mppga/ui/button";

export function Hero() {
  return (
    <section className="border-b border-mppga-divider">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
          Maine Professional Pet Groomers Association
        </p>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight text-mppga-ink sm:text-6xl">
          A professional home for the people who care for Maine&apos;s pets.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-mppga-ink-soft">
          MPPGA is a statewide community of pet groomers committed to safe,
          skilled, ethical care. Membership opens the door to continuing
          education, peer support, and a public directory of the groomers
          Mainers trust.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/join" variant="primary" size="lg">
            Join MPPGA
          </ButtonLink>
          <ButtonLink href="/events" variant="secondary" size="lg">
            See upcoming events
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
