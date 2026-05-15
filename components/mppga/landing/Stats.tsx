// TODO: replace placeholder values with real numbers from the client.
const stats: ReadonlyArray<{ value: string; label: string }> = [
  { value: "100+", label: "Maine groomers" },
  { value: "16", label: "Counties served" },
  { value: "Year-round", label: "Workshops & meetups" },
  { value: "501(c)(6)", label: "Nonprofit" },
];

export function Stats() {
  return (
    <section className="border-b border-mppga-divider bg-mppga-sand">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden bg-mppga-divider sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-mppga-sand px-6 py-12">
            <p className="font-serif text-3xl text-mppga-teal-deep sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-mppga-ink-soft">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
