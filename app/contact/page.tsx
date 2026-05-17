import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import { Mail, MapPin, Phone } from "lucide-react";

import { submitContactAction } from "@/lib/contact/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Contact · MPPGA",
  description:
    "Reach the Maine Professional Pet Groomers Association board with questions about membership, events, or partnership.",
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

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: "mppga207@gmail.com",
    href: "mailto:mppga207@gmail.com",
    note: "Best for membership questions and general inquiries.",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(207) 555-0117",
    href: "tel:+12075550117",
    note: "Voicemail is checked weekly by a board member.",
  },
  {
    icon: MapPin,
    label: "Mailing address",
    value: "PO Box —, Portland, ME",
    href: null,
    note: "Mailed correspondence reaches the board within ~2 weeks.",
  },
];

export default async function ContactPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = readStatus(sp.status);
  const wired = isSupabaseConfigured();
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-20 md:py-24">
          <div className="mx-auto max-w-[1140px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Contact
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-6xl">
              Talk to the board.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mppga-ink-soft md:text-lg">
              MPPGA is run by volunteer groomers. We read everything that
              comes in, and we&rsquo;ll get back to you as quickly as we can
              &mdash; usually within a few business days.
            </p>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-12 px-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Send a message
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink">
                Tell us what you need.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                Membership, event sponsorship, press inquiries &mdash; any of
                it lands in the right inbox.
              </p>

              {status === "sent" ? (
                <div
                  className="mt-8 rounded-lg border border-mppga-teal/40 bg-mppga-teal-tint px-5 py-4 text-sm text-mppga-teal-darker"
                  role="status"
                >
                  Thanks — your message is in. A board member will reply
                  from{" "}
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
                      className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                    />
                  </Field>
                  <Field label="Email" htmlFor="contact-email">
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                    />
                  </Field>
                </div>

                <Field label="Topic" htmlFor="contact-topic">
                  <select
                    id="contact-topic"
                    name="topic"
                    defaultValue="membership"
                    className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
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

            <aside className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Other ways to reach us
              </p>
              <div className="space-y-3">
                {channels.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.label}
                      className="rounded-lg border border-mppga-divider bg-mppga-card p-5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
                          <Icon className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
                            {c.label}
                          </p>
                          {c.href ? (
                            <a
                              href={c.href}
                              className="mt-1 block break-words text-sm text-mppga-teal hover:text-mppga-teal-hover"
                            >
                              {c.value}
                            </a>
                          ) : (
                            <p className="mt-1 break-words text-sm text-mppga-ink">
                              {c.value}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-mppga-ink-muted">
                            {c.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-mppga-sand py-16">
          <div className="mx-auto flex max-w-[1140px] flex-col items-center px-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Already a member?
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl tracking-tight text-mppga-ink">
              Manage your account in the member portal.
            </h2>
            <div className="mt-6">
              <Button href="/sign-in" variant="secondary">
                Sign in
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

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
