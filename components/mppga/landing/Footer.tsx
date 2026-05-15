import Link from "next/link";

const associationLinks: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/about", label: "About" },
  { href: "/join", label: "Join MPPGA" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="bg-mppga-teal-darker text-mppga-teal-tint">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-mppga-teal-tint font-serif text-lg text-mppga-teal-deep">
                M
              </span>
              <span className="font-serif text-lg text-white">MPPGA</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-mppga-teal-tint">
              Maine Professional Pet Groomers Association — a 501(c)(6)
              nonprofit trade association for groomers across the state.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white">
              Association
            </p>
            <ul className="mt-4 space-y-2">
              {associationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mppga-teal-tint hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white">
              Contact
            </p>
            <p className="mt-4 text-sm">
              <a
                href="mailto:hello@mppga.org"
                className="text-mppga-teal-tint hover:text-white"
              >
                hello@mppga.org
              </a>
            </p>
          </div>
        </div>
        <div className="mt-12 border-t border-mppga-teal-deep pt-6 text-xs text-mppga-teal-tint">
          © {new Date().getFullYear()} Maine Professional Pet Groomers
          Association. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
