import Link from "next/link";
import { ButtonLink } from "@/components/mppga/ui/button";

export function ClosingCTA() {
  return (
    <section className="bg-mppga-teal-darker text-white">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-white">
          Join the people raising the standard of pet grooming in Maine.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-mppga-teal-tint">
          Apply for membership in a few minutes. Approval is handled by the
          volunteer board.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <ButtonLink href="/join" variant="inverse" size="lg">
            Apply for membership
          </ButtonLink>
          <Link
            href="/contact"
            className="text-sm text-mppga-teal-tint hover:text-white"
          >
            Or contact us with questions
          </Link>
        </div>
      </div>
    </section>
  );
}
