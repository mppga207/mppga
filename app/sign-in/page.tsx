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
      </main>

      <Footer />
    </div>
  );
}
