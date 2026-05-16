import Link from "next/link";
import { Button } from "@/components/mppga/ui/button";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-mppga-divider bg-mppga-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-mppga-teal font-serif text-lg text-white">
            M
          </span>
          <span className="font-serif text-lg text-mppga-ink">MPPGA</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            href="/sign-in"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            Sign in
          </Button>
          <Button href="/join" variant="primary">
            Join Now
          </Button>
        </div>
      </div>
    </header>
  );
}
