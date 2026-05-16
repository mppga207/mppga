import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import { GraduationCap, Quote, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "About · MPPGA",
  description:
    "The Maine Professional Pet Groomers Association — a statewide 501(c)(6) built by groomers, for groomers.",
};

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const pillars: Pillar[] = [
  {
    icon: Users,
    title: "Community & support",
    body: "Connecting salon owners, mobile stylists, educators, and apprentices across Maine for collaboration and professional advancement.",
  },
  {
    icon: ShieldCheck,
    title: "Safety & standards",
    body: "We embrace the PPGSA Standards of Care, Safety and Sanitation — humane practice and clean, safe environments in every salon.",
  },
  {
    icon: GraduationCap,
    title: "Education & growth",
    body: "Continuing education, workshops, and professional development that help Maine groomers stay connected and thrive.",
  },
];

const objectives = [
  "Promote advancement in all areas of groomer education and best practices.",
  "Encourage professionalism, humane animal care, and high standards in groomer conduct.",
  "Build a strong network of Maine groomers who share knowledge, resources, and opportunities.",
  "Advocate for consistent safety and sanitation practices that protect pets, groomers, and the public.",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-20 md:py-24">
          <div className="mx-auto max-w-[1140px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              About MPPGA
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-6xl">
              Maine&rsquo;s professional voice for pet groomers.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mppga-ink-soft md:text-lg">
              The Maine Professional Pet Groomers Association (MPPGA) is a
              statewide nonprofit 501(c)(6) created by and for Maine&rsquo;s
              professional pet groomers &mdash; built on education,
              professionalism, safety, and community.
            </p>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-sand py-20">
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-14 px-6 md:grid-cols-[1fr_1.25fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Our mission
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                Built by Maine groomers, for Maine groomers.
              </h2>
              <div className="mt-6 h-px w-16 bg-mppga-gold" />
            </div>

            <div className="space-y-6">
              <p className="text-base leading-relaxed text-mppga-ink-soft">
                MPPGA is a membership-based nonprofit devoted to promoting the
                common business interests of professional groomers and
                enhancing the standards of the grooming industry. We bring
                together salon owners, mobile stylists, apprentices, educators,
                and experienced professionals to strengthen the craft of pet
                grooming in Maine and promote growth in the industry for years
                to come.
              </p>

              <blockquote className="relative rounded-lg border border-mppga-gold/30 bg-white/60 p-6 font-serif text-lg italic leading-relaxed text-mppga-teal-darker shadow-sm">
                <span
                  aria-hidden
                  className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-mppga-gold p-1.5 text-white shadow"
                >
                  <Quote className="h-full w-full" strokeWidth={2} />
                </span>
                Our mission is to support and elevate the grooming profession
                by fostering education, professionalism, safety, and community
                among groomers across the state.
              </blockquote>
            </div>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                What we do
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                Three pillars.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <article
                    key={p.title}
                    className="flex flex-col rounded-2xl border border-mppga-divider bg-mppga-card p-7 shadow-sm"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-mppga-teal-tint to-mppga-sand text-mppga-teal-deep ring-1 ring-mppga-gold/30">
                      <Icon className="h-6 w-6" strokeWidth={1.6} />
                    </span>
                    <h3 className="mt-5 font-serif text-2xl text-mppga-ink">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                      {p.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-mppga-teal-deep py-20 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative mx-auto max-w-[1140px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-gold">
              Our purpose
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-white md:text-5xl">
              MPPGA exists to:
            </h2>
            <ul className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-14 md:gap-y-10">
              {objectives.map((text, i) => (
                <li key={i} className="flex items-start gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-mppga-gold/40 bg-mppga-gold/10 font-serif text-base font-medium text-mppga-gold">
                    {i + 1}
                  </span>
                  <p className="text-base leading-relaxed text-white/90 md:text-lg">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Board of directors
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                Volunteer leadership.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-mppga-ink-soft">
                MPPGA is governed by a volunteer board of working Maine
                groomers elected by the membership. Roster and bios will be
                published here once the founding board is seated.
              </p>
            </div>

            <div className="mt-10 rounded-lg border border-dashed border-mppga-divider bg-mppga-card p-10 text-center">
              <p className="text-sm text-mppga-ink-soft">
                Board roster coming soon.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-mppga-sand py-20">
          <div className="mx-auto flex max-w-[1140px] flex-col items-center px-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Get involved
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
              Add your name to the standard.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-mppga-ink-soft">
              Membership is open to professional groomers, salon owners,
              mobile stylists, apprentices, and educators working in Maine.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/join" size="lg">
                Become a member
              </Button>
              <Button href="/contact" variant="ghost" size="lg">
                Contact the board
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
