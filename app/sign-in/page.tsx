import Link from "next/link";
import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";

export const metadata = {
  title: "Sign in · MPPGA",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main className="mx-auto flex max-w-md flex-col px-6 pb-20 pt-20">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
            Member sign-in
          </p>
          <h1 className="mt-2 font-serif text-3xl text-mppga-ink">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
            Sign in to manage your membership, register for events, and update
            your directory listing.
          </p>
        </div>

        <form
          className="mt-10 space-y-5 rounded-lg border border-mppga-divider bg-mppga-card p-8"
          aria-label="Sign in form"
        >
          <Field id="email" label="Email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
            />
          </Field>

          <Field id="password" label="Password">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
            />
          </Field>

          <Button size="lg" className="w-full">
            Sign in
          </Button>

          <div className="space-y-3 border-t border-dashed border-mppga-divider pt-5">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Prototype shortcuts
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard"
                className="flex h-10 items-center justify-center rounded-md border border-mppga-divider bg-mppga-page text-sm font-medium text-mppga-teal transition-colors hover:border-mppga-teal hover:bg-mppga-teal-tint"
              >
                Member dashboard
              </Link>
              <Link
                href="/admin"
                className="flex h-10 items-center justify-center rounded-md border border-mppga-divider bg-mppga-page text-sm font-medium text-mppga-teal transition-colors hover:border-mppga-teal hover:bg-mppga-teal-tint"
              >
                Admin dashboard
              </Link>
            </div>
            <p className="text-center text-[11px] leading-relaxed text-mppga-ink-muted">
              Temporary preview links. Real auth comes online before launch.
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-mppga-ink-soft">
          Not a member yet?{" "}
          <Link
            href="/join"
            className="font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            Join MPPGA
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-mppga-ink-soft"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
