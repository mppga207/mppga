import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";

import { submitContactAction } from "@/lib/contact/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Contact · MPPGA",
  description:
    "Send a message to the Maine Professional Pet Groomers Association with questions about membership, events, or partnership.",
};

type FormStatus = "sent" | "invalid" | "error" | "email" | null;

function readStatus(value: string | string[] | undefined): FormStatus {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "sent" || v === "invalid" || v === "error" || v === "email") {
    return v;
  }
  return null;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = readStatus(sp.status);
  const wired = isSupabaseConfigured();
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-16 md:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Contact
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-5xl">
              Send us a message.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-mppga-ink-soft">
              Membership, event sponsorship, press, or anything else.
              We&rsquo;ll reply within a few business days.
            </p>

            {status === "sent" ? (
              <div
                className="mt-8 rounded-lg border border-mppga-teal/40 bg-mppga-teal-tint px-5 py-4 text-sm text-mppga-teal-darker"
                role="status"
              >
                Thanks, your message is in. We&rsquo;ll reply from{" "}
                <a
                  href="mailto:mppga207@gmail.com"
                  className="underline underline-offset-2"
                >
                  mppga207@gmail.com
                </a>{" "}
                within a few business days.
              </div>
            ) : null}
            {status === "invalid" ? (
              <div
                className="mt-8 rounded-lg border border-mppga-divider bg-mppga-sand px-5 py-4 text-sm text-mppga-ink"
                role="alert"
              >
                We couldn&rsquo;t read every field. Double-check your name,
                email, and message, then try again.
              </div>
            ) : null}
            {status === "error" ? (
              <div
                className="mt-8 rounded-lg border border-mppga-divider bg-mppga-sand px-5 py-4 text-sm text-mppga-ink"
                role="alert"
              >
                Something went wrong on our end. Please email{" "}
                <a
                  href="mailto:mppga207@gmail.com"
                  className="text-mppga-teal hover:text-mppga-teal-hover"
                >
                  mppga207@gmail.com
                </a>{" "}
                directly while we look into it.
              </div>
            ) : null}

            <form
              className="mt-8 space-y-5"
              aria-describedby="contact-form-note"
              action={wired ? submitContactAction : undefined}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Your name" htmlFor="contact-name">
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Email" htmlFor="contact-email">
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Topic" htmlFor="contact-topic">
                <select
                  id="contact-topic"
                  name="topic"
                  defaultValue="membership"
                  className={inputClass}
                >
                  <option value="membership">Membership</option>
                  <option value="events">Events</option>
                  <option value="sponsorship">Sponsorship</option>
                  <option value="press">Press</option>
                  <option value="other">Something else</option>
                </select>
              </Field>

              <Field label="Message" htmlFor="contact-message">
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  required
                  className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p
                  id="contact-form-note"
                  className="text-xs text-mppga-ink-muted"
                >
                  We never share your email. You&rsquo;ll get a reply at the
                  address above.
                </p>
                <Button type="submit" disabled={!wired}>
                  Send message
                </Button>
              </div>
              {wired ? null : (
                <p className="text-xs text-mppga-ink-muted">
                  Form submission is being wired up. In the meantime,
                  please email{" "}
                  <a
                    href="mailto:mppga207@gmail.com"
                    className="text-mppga-teal hover:text-mppga-teal-hover"
                  >
                    mppga207@gmail.com
                  </a>{" "}
                  directly.
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
