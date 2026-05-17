import Link from "next/link";

const explore = [
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-mppga-divider bg-mppga-page py-16">
      <div className="mx-auto max-w-[1140px] px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-ink-muted">
              Association
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mppga-ink-soft">
              Maine Professional Pet Groomers Association
              <br />
              PO Box &mdash;, Portland, ME
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-ink-muted">
              Explore
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-mppga-ink-soft transition-colors hover:text-mppga-teal"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mppga-ink-muted">
              Contact
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mppga-ink-soft">
              mppga207@gmail.com
              <br />
              (207) 555-0117
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-2 border-t border-mppga-divider pt-6 text-xs text-mppga-ink-muted">
          <span>&copy; {year} Maine Professional Pet Groomers Association</span>
          <span>Prototype build</span>
        </div>
      </div>
    </footer>
  );
}
