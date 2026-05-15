const purposes: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Raise the standard of grooming",
    body: "Continuing education, mentorship, and a shared code of ethics — practical, ongoing, and led by working groomers.",
  },
  {
    title: "Connect pet owners to trusted care",
    body: "A statewide directory of vetted, member-listed grooming professionals, searchable by location and services.",
  },
  {
    title: "Build a community of practice",
    body: "Workshops, regional meetups, and a private space to share work, ask questions, and support one another.",
  },
];

export function ExistsTo() {
  return (
    <section className="border-b border-mppga-divider bg-mppga-page">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
          What we exist to do
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl text-mppga-ink">
          Three things we set out to do, every year.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {purposes.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-mppga-divider bg-mppga-card p-6"
            >
              <h3 className="font-serif text-xl text-mppga-ink">{p.title}</h3>
              <p className="mt-3 text-mppga-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
