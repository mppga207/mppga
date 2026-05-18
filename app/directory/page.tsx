import Link from "next/link";

import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { createClient } from "@/lib/supabase/server";
import { ExternalLink, MapPin, Phone } from "lucide-react";

export const metadata = {
  title: "Find a salon · MPPGA",
  description:
    "Browse Maine pet grooming salons by town. Salons listed here are members of the Maine Professional Pet Groomers Association.",
};

interface Salon {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
}

function pickCity(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return (v ?? "").trim();
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:+1${digits}`;
}

type PageProps = {
  searchParams: Promise<{ city?: string | string[] }>;
};

export default async function DirectoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const city = pickCity(sp.city);
  const supabase = await createClient();

  const [salonsResult, citiesResult] = await Promise.all([
    supabase.rpc("public_salons", {
      p_city: city.length > 0 ? city : null,
      p_limit: 200,
    }),
    supabase.rpc("public_salon_cities", {}),
  ]);

  const salons = (salonsResult.data ?? []) as Salon[];
  const cities = ((citiesResult.data ?? []) as { city: string }[]).map(
    (r) => r.city,
  );

  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main>
        <section className="border-b border-mppga-divider bg-mppga-page py-16 md:py-20">
          <div className="mx-auto max-w-[1140px] px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
              Directory
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.05] tracking-tight text-mppga-ink md:text-5xl">
              Find a Maine grooming salon.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-mppga-ink-soft">
              Salons listed here are members of the Maine Professional Pet
              Groomers Association.
            </p>

            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
                  Town
                </span>
                <select
                  name="city"
                  defaultValue={city}
                  className="h-11 min-w-[240px] rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                >
                  <option value="">All towns</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-11 rounded-md bg-mppga-teal px-4 text-sm font-medium text-white transition-colors hover:bg-mppga-teal-hover"
              >
                Apply
              </button>
              {city ? (
                <Link
                  href="/directory"
                  className="inline-flex h-11 items-center px-3 text-sm font-medium text-mppga-teal hover:text-mppga-teal-hover"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </section>

        <section className="bg-mppga-page py-12">
          <div className="mx-auto max-w-[1140px] px-6">
            <p className="mb-6 text-sm text-mppga-ink-muted">
              {salons.length === 0
                ? "No matches"
                : salons.length === 1
                  ? "1 salon"
                  : `${salons.length} salons`}
              {city ? ` in ${city}` : ""}
            </p>

            {salons.length === 0 ? (
              <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-10 text-center">
                <p className="font-serif text-xl text-mppga-ink">
                  No salons {city ? `in ${city} ` : ""}listed yet.
                </p>
                <p className="mt-3 text-sm text-mppga-ink-soft">
                  Check back as more groomers join MPPGA.
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {salons.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col rounded-2xl border border-mppga-divider bg-mppga-card p-6 shadow-sm"
                  >
                    <h2 className="font-serif text-xl text-mppga-ink">
                      {s.name}
                    </h2>
                    {s.city ? (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {s.city}
                        {s.state ? `, ${s.state}` : ""}
                      </p>
                    ) : null}
                    <div className="mt-4 space-y-2 text-sm">
                      {s.phone ? (
                        <a
                          href={telHref(s.phone)}
                          className="inline-flex items-center gap-1.5 text-mppga-teal hover:text-mppga-teal-hover"
                        >
                          <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {s.phone}
                        </a>
                      ) : null}
                      {s.website ? (
                        <div>
                          <a
                            href={s.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 break-words text-mppga-teal hover:text-mppga-teal-hover"
                          >
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              strokeWidth={1.8}
                            />
                            Visit website
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
