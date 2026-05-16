"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/mppga/ui/button";
import {
  joinMembership,
  type AuthFormState,
} from "@/lib/auth/actions";

const initial: AuthFormState = { status: "idle" };

interface TierOption {
  slug: "student" | "professional" | "corporate";
  name: string;
}

export function JoinForm({
  tiers,
  defaultTier = "professional",
}: {
  tiers: TierOption[];
  defaultTier?: TierOption["slug"];
}) {
  const [state, formAction] = useActionState(joinMembership, initial);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 text-center shadow-sm">
        <p className="font-serif text-2xl text-mppga-ink">Check your email</p>
        <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
          We sent a sign-in link to{" "}
          <span className="font-medium text-mppga-ink">{state.email}</span>.
          Click it to finish creating your account — you’ll land on your
          dashboard with a one-time dues payment to complete.
        </p>
        <p className="mt-4 text-xs text-mppga-ink-muted">
          Didn’t get the email? Check your spam folder and the address you
          entered, then try again.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 shadow-sm"
      aria-describedby="apply-form-note"
    >
      <div className="space-y-5">
        <ApplyField label="Your name" htmlFor="apply-name">
          <input
            id="apply-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </ApplyField>

        <ApplyField label="Email" htmlFor="apply-email">
          <input
            id="apply-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </ApplyField>

        <ApplyField label="Where you groom" htmlFor="apply-location">
          <input
            id="apply-location"
            name="location"
            type="text"
            placeholder="City or town in Maine"
            className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </ApplyField>

        <ApplyField label="Tier" htmlFor="apply-tier">
          <select
            id="apply-tier"
            name="tier"
            defaultValue={defaultTier}
            className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          >
            {tiers.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </ApplyField>

        <div className="flex items-start gap-2.5 pt-2">
          <input
            id="apply-standards"
            name="standards"
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
          />
          <label
            htmlFor="apply-standards"
            className="text-xs leading-relaxed text-mppga-ink-soft"
          >
            I agree to abide by the PPGSA Standards of Care, Safety and
            Sanitation and the MPPGA Code of Ethics.
          </label>
        </div>

        {state.status === "error" ? (
          <p className="text-sm text-red-700">{state.message}</p>
        ) : null}

        <div className="pt-2">
          <SubmitButton />
        </div>

        <p id="apply-form-note" className="text-xs text-mppga-ink-muted">
          We’ll send a one-tap sign-in link. After you click it, complete
          your dues payment and your member portal unlocks immediately.
        </p>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send my sign-in link"}
    </Button>
  );
}

function ApplyField({
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
