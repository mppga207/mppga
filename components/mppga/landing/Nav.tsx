import Link from "next/link";
import { ButtonLink } from "@/components/mppga/ui/button";

const links = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-mppga-divider bg-mppga-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-mppga-teal-tint font-serif text-lg text-mppga-teal-deep">
            M
          </span>
          <span className="hidden text-sm font-medium text-mppga-ink sm:inline">
            MPPGA
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <ul className="hidden items-center gap-6 sm:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-mppga-ink-soft hover:text-mppga-teal"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/join" variant="primary" size="md">
            Join
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
