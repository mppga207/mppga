import Link from "next/link";

import { JoinForm } from "@/components/mppga/auth/JoinForm";
import { Footer } from "@/components/mppga/landing/Footer";
import { Nav } from "@/components/mppga/landing/Nav";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Apply · MPPGA",
  description:
    "Complete your MPPGA membership application in three short, guided steps.",
};

type TierSlug = "basic" | "professional" | "salon";

const TIER_SLUGS: readonly TierSlug[] = ["basic", "professional", "salon"];

interface TierRow {
  slug: string;
  name: string;
}

async function loadApplyTiers(): Promise<{ slug: TierSlug; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tiers")
    .select("slug, name, display_order")
    .order("display_order", { ascending: true })
    .returns<TierRow[]>();
  if (!data) return [];
  const rows: { slug: TierSlug; name: string }[] = [];
  for (const row of data) {
    if (
      row.slug === "basic" ||
      row.slug === "professional" ||
      row.slug === "salon"
    ) {
      rows.push({ slug: row.slug, name: row.name });
    }
  }
  return rows;
}

function parseTierParam(value: string | string[] | undefined): TierSlug {
  const v = Array.isArray(value) ? value[0] : value;
  if (v && (TIER_SLUGS as readonly string[]).includes(v)) {
    return v as TierSlug;
  }
  return "professional";
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string | string[] }>;
}) {
  const [tiers, sp] = await Promise.all([loadApplyTiers(), searchParams]);
  const initialTier = parseTierParam(sp.tier);
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-14 md:py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <Link
              href="/join#tiers"
              className="inline-flex items-center gap-1 text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Back to tiers
            </Link>

            <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Application
            </p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-mppga-ink md:text-4xl">
              Complete your application.
            </h1>

            <div className="mt-10">
              <JoinForm tiers={tiers} defaultTier={initialTier} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
