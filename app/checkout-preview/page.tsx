import { Nav } from "@/components/mppga/landing/Nav";
import { Footer } from "@/components/mppga/landing/Footer";
import { Button } from "@/components/mppga/ui/button";

export const metadata = {
  title: "Checkout preview · MPPGA",
};

export default function CheckoutPreviewPage() {
  return (
    <div className="min-h-screen bg-mppga-page text-mppga-ink">
      <Nav />

      <main className="mx-auto max-w-[1140px] px-6 pb-20 pt-12">
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
            Complete your membership
          </p>
          <h1 className="mt-2 font-serif text-4xl text-mppga-ink">
            Almost there, Sarah
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-mppga-ink-soft">
            Add your payment details below to activate your membership and
            unlock the directory, events, and member resources.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <PaymentColumn />
          <OrderSummary />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PaymentColumn() {
  return (
    <section className="rounded-lg border border-mppga-divider bg-mppga-card p-8">
      <h2 className="font-serif text-2xl text-mppga-ink">Payment details</h2>
      <p className="mt-1 text-sm text-mppga-ink-muted">
        Secured by Stripe. Your card details never touch our servers.
      </p>

      <div className="mt-8">
        <PaymentElementMockup />
      </div>

      <div className="mt-8 border-t border-mppga-divider pt-6">
        <Button size="lg" className="w-full">
          Pay $145.00 and activate membership
        </Button>
        <p className="mt-4 text-center text-xs text-mppga-ink-muted">
          By clicking pay, you agree to MPPGA&rsquo;s{" "}
          <a
            href="#"
            className="underline decoration-mppga-divider underline-offset-2 hover:text-mppga-teal hover:decoration-mppga-teal"
          >
            membership terms
          </a>
          {" and "}
          <a
            href="#"
            className="underline decoration-mppga-divider underline-offset-2 hover:text-mppga-teal hover:decoration-mppga-teal"
          >
            code of ethics
          </a>
          . Membership renews annually.
        </p>
      </div>
    </section>
  );
}

function PaymentElementMockup() {
  return (
    <div className="space-y-5">
      <PaymentMethodTabs />

      <div className="space-y-4">
        <Field label="Card information">
          <CardNumberInput />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <input
            aria-label="Expiry"
            placeholder="MM / YY"
            className="h-11 rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
          />
          <input
            aria-label="CVC"
            placeholder="CVC"
            className="h-11 rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
          />
        </div>

        <Field label="Country">
          <div className="flex h-11 items-center justify-between rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink">
            <span>United States</span>
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="text-mppga-ink-muted"
            >
              <path
                d="M2 4l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Field>

        <Field label="ZIP">
          <input
            placeholder="04011"
            className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 pt-1">
        <input
          type="checkbox"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal"
        />
        <span className="text-xs leading-relaxed text-mppga-ink-soft">
          Save my card for future renewals and event tickets.
        </span>
      </label>

      <p className="pt-2 text-[11px] text-mppga-ink-muted">
        Powered by{" "}
        <span className="font-medium text-mppga-ink-soft">Stripe</span> ·{" "}
        <a href="#" className="hover:text-mppga-teal">
          Terms
        </a>{" "}
        ·{" "}
        <a href="#" className="hover:text-mppga-teal">
          Privacy
        </a>
      </p>
    </div>
  );
}

function PaymentMethodTabs() {
  return (
    <div className="rounded-md border border-mppga-divider bg-mppga-page p-1">
      <div className="grid grid-cols-3 gap-1">
        <TabButton active>
          <CardGlyph />
          <span>Card</span>
        </TabButton>
        <TabButton>
          <LinkGlyph />
          <span>Link</span>
        </TabButton>
        <TabButton>
          <BankGlyph />
          <span>US bank</span>
        </TabButton>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        "flex h-9 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors",
        active
          ? "bg-mppga-card text-mppga-ink shadow-sm"
          : "text-mppga-ink-muted hover:text-mppga-ink-soft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-mppga-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}

function CardNumberInput() {
  return (
    <div className="relative">
      <input
        placeholder="1234 1234 1234 1234"
        className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 pr-24 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
      />
      <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        <BrandPill label="VISA" tone="visa" />
        <BrandPill label="MC" tone="mc" />
        <BrandPill label="AMEX" tone="amex" />
      </div>
    </div>
  );
}

function BrandPill({
  label,
  tone,
}: {
  label: string;
  tone: "visa" | "mc" | "amex";
}) {
  const colors: Record<typeof tone, string> = {
    visa: "bg-[#1A1F71] text-white",
    mc: "bg-[#EB001B] text-white",
    amex: "bg-[#2E77BB] text-white",
  };
  return (
    <span
      className={[
        "rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
        colors[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function CardGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
      />
      <rect x="0.5" y="3" width="15" height="2" fill="currentColor" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <span className="rounded-sm bg-[#00D66F] px-1 py-px text-[9px] font-bold text-white">
      Link
    </span>
  );
}

function BankGlyph() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
      <path
        d="M7 1L13 3.5H1L7 1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <rect x="2" y="5" width="1.5" height="4" fill="currentColor" />
      <rect x="6.25" y="5" width="1.5" height="4" fill="currentColor" />
      <rect x="10.5" y="5" width="1.5" height="4" fill="currentColor" />
      <rect x="1" y="10" width="12" height="1.5" fill="currentColor" />
    </svg>
  );
}

function OrderSummary() {
  return (
    <aside className="space-y-4">
      <div className="rounded-lg border border-mppga-divider bg-mppga-card p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Order summary
        </p>

        <div className="mt-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-mppga-ink">
                Professional membership
              </p>
              <p className="mt-0.5 text-xs text-mppga-ink-muted">
                Annual · renews May 16, 2027
              </p>
            </div>
            <p className="text-sm font-medium text-mppga-ink">$145.00</p>
          </div>

          <div className="border-t border-mppga-divider pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-mppga-ink-soft">Subtotal</p>
              <p className="text-xs text-mppga-ink-soft">$145.00</p>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-mppga-ink-soft">Sales tax</p>
              <p className="text-xs text-mppga-ink-soft">$0.00</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-mppga-divider pt-4">
            <p className="text-sm font-medium text-mppga-ink">Total due today</p>
            <p className="font-serif text-2xl text-mppga-ink">$145.00</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-mppga-divider bg-mppga-sand p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-soft">
          What you get
        </p>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-mppga-ink-soft">
          <li className="flex gap-2">
            <Check /> Listing in the public groomer directory
          </li>
          <li className="flex gap-2">
            <Check /> Member pricing at all MPPGA events
          </li>
          <li className="flex gap-2">
            <Check /> Connection to a statewide groomer community
          </li>
          <li className="flex gap-2">
            <Check /> Access to member-only resources
          </li>
        </ul>
      </div>

      <p className="rounded-md border border-mppga-divider bg-mppga-page p-4 text-[11px] leading-relaxed text-mppga-ink-muted">
        Dues paid to MPPGA are not deductible as charitable contributions for
        federal income tax purposes but may be deductible as ordinary business
        expenses. MPPGA is a 501(c)(6) trade association.
      </p>
    </aside>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className="mt-0.5 shrink-0 text-mppga-teal"
      aria-hidden
    >
      <path
        d="M2 7.5L5.5 11L12 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
