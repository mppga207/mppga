import Link from "next/link";
import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { SignInForm } from "@/components/mppga/auth/SignInForm";

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
            Enter your email and we’ll send you a one-tap sign-in link.
            No passwords to remember.
          </p>
        </div>

        <SignInForm />

        <p className="mt-6 text-center text-sm text-mppga-ink-soft">
          Not a member yet?{" "}
          <Link
            href="/join"
            className="font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            Join MPPGA
          </Link>
        </p>

        <div className="mt-10 rounded-lg border border-dashed border-mppga-divider bg-mppga-sand/40 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Preview (temporary)
          </p>
          <p className="mt-2 text-xs leading-relaxed text-mppga-ink-soft">
            Skip auth and jump straight into a dashboard. Remove before launch.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {/* Plain anchors hit the route handler with a full navigation;
                next/link soft-navigates and would 404 on the client. */}
            {/* eslint-disable @next/next/no-html-link-for-pages */}
            <a
              href="/api/preview/member"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-mppga-teal px-4 text-sm font-medium text-mppga-teal transition-colors hover:bg-mppga-teal-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mppga-teal focus-visible:ring-offset-2 focus-visible:ring-offset-mppga-page"
            >
              Member dashboard
            </a>
            <a
              href="/api/preview/admin"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-mppga-teal px-4 text-sm font-medium text-mppga-teal transition-colors hover:bg-mppga-teal-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mppga-teal focus-visible:ring-offset-2 focus-visible:ring-offset-mppga-page"
            >
              Admin dashboard
            </a>
            {/* eslint-enable @next/next/no-html-link-for-pages */}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
