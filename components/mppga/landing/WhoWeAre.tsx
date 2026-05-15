export function WhoWeAre() {
  return (
    <section id="about" className="border-b border-mppga-divider">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Who we are
            </p>
            <h2 className="mt-4 font-serif text-3xl text-mppga-ink">
              A volunteer-led trade association for Maine groomers.
            </h2>
          </div>
          <div className="space-y-4 md:col-span-2">
            <p className="text-mppga-ink-soft">
              MPPGA was founded by working groomers who saw the same gaps
              statewide: limited access to continuing education, no shared
              directory for pet owners, and few opportunities to gather and
              learn from one another.
            </p>
            <p className="text-mppga-ink-soft">
              We are a 501(c)(6) nonprofit, run by a board of practicing
              groomers. Every dollar of dues goes back into the work —
              workshops, scholarships, ethics education, and the tools that
              help our members thrive.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
