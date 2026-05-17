import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";
import { JoinForm } from "@/components/mppga/auth/JoinForm";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Join · MPPGA",
  description:
    "Become a member of the Maine Professional Pet Groomers Association. Three tiers built for working groomers.",
};

type TierSlug = "basic" | "professional" | "salon";

interface TierPresentation {
  shortLabel: string;
  icon: LucideIcon;
  tagline: string;
  benefits: string[];
  featured: boolean;
}

// Slug-keyed presentation: icon, tagline, "apply as ___" label, and the
// benefit bullet list. Name + description + dues read live from the
// `tiers` table so admin edits in Settings → Tier configuration appear
// on the public Join page immediately (revalidatePath("/join") fires
// from lib/admin/tiers-actions.ts).
const TIER_PRESENTATION: Record<TierSlug, TierPresentation> = {
  basic: {
    shortLabel: "a basic member",
    icon: GraduationCap,
    tagline: "Learning the craft.",
    benefits: [
      "Access to continuing education resources",
      "Member event pricing",
      "Member community access",
      "Directory listing optional",
    ],
    featured: false,
  },
  professional: {
    shortLabel: "professional",
    icon: UserRound,
    tagline: "The working groomer.",
    benefits: [
      "Public directory listing across Maine",
      "Member event pricing",
      "Continuing education tracking",
      "Member community access",
    ],
    featured: true,
  },
  salon: {
    shortLabel: "a salon",
    icon: Building2,
    tagline: "For shop owners and salons.",
    benefits: [
      "Priority placement in the public directory",
      "Sub-profiles for every staff groomer",
      "Member event pricing for the whole team",
      "Salon-level recognition at MPPGA events",
    ],
    featured: false,
  },
};

interface JoinTier {
  slug: TierSlug;
  name: string;
  description: string;
  presentation: TierPresentation;
}

interface TierRow {
  slug: string;
  name: string;
  description: string;
  display_order: number;
}

async function loadJoinTiers(): Promise<JoinTier[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tiers")
    .select("slug, name, description, display_order")
    .order("display_order", { ascending: true })
    .returns<TierRow[]>();
  if (!data) return [];

  const rows: JoinTier[] = [];
  for (const row of data) {
    if (row.slug !== "basic" && row.slug !== "professional" && row.slug !== "salon") {
      continue;
    }
    rows.push({
      slug: row.slug,
      name: row.name,
      description: row.description,
      presentation: TIER_PRESENTATION[row.slug],
    });
  }
  return rows;
}

const steps = [
  {
    n: 1,
    title: "Sign up",
    body: "Tell us your name, email, password, and which tier fits. We’ll send a verification email to your inbox.",
  },
  {
    n: 2,
    title: "Pay your dues",
    body: "Confirm your email, land on your dashboard, and complete your dues payment in Stripe. Annual renewal is handled automatically.",
  },
  {
    n: 3,
    title: "Welcome aboard",
    body: "Your portal unlocks the directory, events, and community the moment payment clears.",
  },
];

export default async function JoinPage() {
  const tiers = await loadJoinTiers();
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-20 md:py-24">
          <div className="mx-auto max-w-[1140px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Membership
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-6xl">
              Join the groomers raising the standard.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mppga-ink-soft md:text-lg">
              MPPGA membership is open to professional groomers, salon owners,
              mobile stylists, apprentices, and educators working in Maine.
              Pick the tier that fits and we&rsquo;ll take it from there.
            </p>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="mb-12 max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Tiers
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                Three ways to join.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                Annual dues are reviewed by the board each year. Final pricing
                will be confirmed on your application before any payment is
                taken.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {tiers.map((tier) => {
                const Icon = tier.presentation.icon;
                const featured = tier.presentation.featured;
                return (
                  <article
                    key={tier.slug}
                    className={
                      featured
                        ? "relative flex flex-col rounded-2xl border-2 border-mppga-teal bg-mppga-card p-7 shadow-lg shadow-mppga-teal/10"
                        : "relative flex flex-col rounded-2xl border border-mppga-divider bg-mppga-card p-7 shadow-sm"
                    }
                  >
                    {featured ? (
                      <span className="absolute -top-3 left-7 rounded-full bg-mppga-teal px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white">
                        Most popular
                      </span>
                    ) : null}

                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mppga-teal-tint text-mppga-teal-deep">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <h3 className="mt-5 font-serif text-2xl text-mppga-ink">
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-mppga-teal">
                      {tier.presentation.tagline}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                      {tier.description}
                    </p>

                    <div className="my-6 h-px w-full bg-mppga-divider" />

                    <ul className="space-y-2.5 text-sm text-mppga-ink-soft">
                      {tier.presentation.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2.5">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-mppga-teal"
                            strokeWidth={2}
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7">
                      <Button
                        href="#apply"
                        variant={featured ? "primary" : "secondary"}
                        className="w-full"
                      >
                        Apply as {tier.presentation.shortLabel}
                        <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-sand py-20">
          <div className="mx-auto max-w-[1140px] px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                How it works
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                Three steps to member.
              </h2>
            </div>

            <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li
                  key={s.n}
                  className="flex flex-col rounded-xl border border-mppga-divider bg-mppga-card p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-mppga-gold/40 bg-mppga-gold/10 font-serif text-base text-mppga-teal-darker">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-serif text-xl text-mppga-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mppga-ink-soft">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-mppga-divider bg-mppga-page py-20">
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-12 px-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                The standard
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink">
                We back the PPGSA Standards of Care.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-mppga-ink-soft">
                Every MPPGA member agrees to the PPGSA Standards of Care,
                Safety and Sanitation: a working framework for humane
                grooming, clean salons, and safe handling. The standards were
                written by groomers, for groomers, and they&rsquo;re part of
                what membership means.
              </p>
            </div>

            <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mppga-teal-tint text-mppga-teal-deep">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <h3 className="mt-5 font-serif text-xl text-mppga-ink">
                Code of ethics
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
                On approval, you&rsquo;ll be asked to read and sign the MPPGA
                Code of Ethics. It&rsquo;s short, plain-language, and the same
                document every member signs. The full text is published in the
                member portal.
              </p>
            </div>
          </div>
        </section>

        <section
          id="apply"
          className="scroll-mt-24 border-b border-mppga-divider bg-mppga-page py-20"
        >
          <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-12 px-6 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                Application
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
                A few details and we’ll take it from there.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-mppga-ink-soft">
                We’ll send a verification email to the address you provide.
                Confirm it, complete your dues payment, and your member
                portal unlocks automatically.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-mppga-ink-soft">
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mppga-teal" strokeWidth={2} />
                  <span>No credit card required to sign up, only at checkout.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mppga-teal" strokeWidth={2} />
                  <span>Sign in with email and password. Pick something memorable.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-mppga-teal" strokeWidth={2} />
                  <span>You can change tiers later if your situation changes.</span>
                </li>
              </ul>
            </div>

            <JoinForm tiers={tiers.map(({ slug, name }) => ({ slug, name }))} />
          </div>
        </section>

        <section className="relative overflow-hidden bg-mppga-teal-deep py-24 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative mx-auto flex max-w-[1140px] flex-col items-center px-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-gold">
              Ready when you are
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl tracking-tight md:text-5xl">
              Start your application.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
              Takes about two minutes. You’ll be in the directory as soon as your dues clear.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="#apply" variant="inverse" size="lg">
                Begin application
              </Button>
              <Button href="/contact" variant="ghost" size="lg" className="text-white hover:text-white/80">
                Questions? Contact the board
              </Button>
            </div>
            <p className="mt-8 max-w-xl text-xs leading-relaxed text-white/60">
              MPPGA is a 501(c)(6) nonprofit. Dues are not deductible as
              charitable contributions but may be deductible as ordinary
              business expenses. Talk to your accountant.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

