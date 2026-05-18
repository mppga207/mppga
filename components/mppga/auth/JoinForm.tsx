"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";

import { SalonCombobox } from "@/components/mppga/auth/SalonCombobox";
import { Button } from "@/components/mppga/ui/button";
import {
  joinMembership,
  type AuthFormState,
} from "@/lib/auth/actions";

const initial: AuthFormState = { status: "idle" };

interface TierOption {
  slug: "basic" | "professional" | "salon";
  name: string;
}

type Slug = TierOption["slug"];

interface FormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  address_line: string;
  city: string;
  zip: string;
  salon_name: string;
  salon_address_line: string;
  salon_city: string;
  salon_zip: string;
  salon_phone: string;
  salon_website: string;
}

const emptyValues: FormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  address_line: "",
  city: "",
  zip: "",
  salon_name: "",
  salon_address_line: "",
  salon_city: "",
  salon_zip: "",
  salon_phone: "",
  salon_website: "",
};

type StepNumber = 1 | 2 | 3;

const STEPS = [
  { n: 1 as const, label: "About you", heading: "About you" },
  { n: 2 as const, label: "Where you work", heading: "Where you work" },
  { n: 3 as const, label: "Review and agree", heading: "Review and agree" },
] as const;

const STEP_HEADING: Record<StepNumber, string> = {
  1: STEPS[0].heading,
  2: STEPS[1].heading,
  3: STEPS[2].heading,
};

type FieldErrors = Partial<Record<keyof FormValues | "standards", string>>;

export function JoinForm({
  tiers,
  defaultTier = "professional",
}: {
  tiers: TierOption[];
  defaultTier?: Slug;
}) {
  const [state, formAction] = useActionState(joinMembership, initial);
  const [tier, setTier] = useState<Slug>(defaultTier);
  const [step, setStep] = useState<StepNumber>(1);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [ownSalon, setOwnSalon] = useState(false);

  // Per-tier behavior:
  //   - Salon-tier signups ARE the salon: the toggle is locked on and
  //     the affiliation combobox is hidden.
  //   - Other tiers: optional "I own a salon" toggle. When off, the
  //     existing-salon combobox lets them affiliate as an employee.
  const isSalonTier = tier === "salon";
  const effectiveOwn = isSalonTier || ownSalon;

  const tierName =
    tiers.find((t) => t.slug === tier)?.name ?? "Professional";

  // When the page-level tier changes (user clicked a different tier
  // card above), sync it in and reset to step 1 so they restart the
  // guided intake against the new choice.
  useEffect(() => {
    setTier(defaultTier);
    setStep(1);
  }, [defaultTier]);

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Move focus to the step heading on transitions for screen readers
  // and to anchor the eye when the form jumps content.
  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function setField<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  }

  function validateStep(n: StepNumber): boolean {
    const next: FieldErrors = {};
    if (n === 1) {
      if (!values.first_name.trim()) next.first_name = "Enter your first name.";
      if (!values.last_name.trim()) next.last_name = "Enter your last name.";
      if (!values.email.trim()) {
        next.email = "Enter your email.";
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) {
        next.email = "Enter a valid email address.";
      }
    }
    if (n === 2 && effectiveOwn && !values.salon_name.trim()) {
      next.salon_name = "Enter your salon's name.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (step === 3) return;
    if (!validateStep(step)) return;
    setStep((step + 1) as StepNumber);
  }

  function goBack() {
    if (step === 1) return;
    setStep((step - 1) as StepNumber);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const next: FieldErrors = {};
    if (!values.password) {
      next.password = "Create a password.";
    } else if (values.password.length < 8) {
      next.password = "Use at least 8 characters.";
    }
    const form = event.currentTarget;
    const standardsEl = form.elements.namedItem(
      "standards",
    ) as HTMLInputElement | null;
    if (!standardsEl?.checked) {
      next.standards = "Agree to the standards to continue.";
    }
    if (Object.keys(next).length > 0) {
      event.preventDefault();
      setErrors(next);
    }
  }

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 text-center shadow-sm">
        <p className="font-serif text-2xl text-mppga-ink">Check your email</p>
        <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
          We sent a verification email to{" "}
          <span className="font-medium text-mppga-ink">{state.email}</span>.
          Confirm your address to finish creating your account. You&rsquo;ll
          land on your dashboard with a one-time dues payment to complete.
        </p>
        <p className="mt-4 text-xs text-mppga-ink-muted">
          Didn&rsquo;t get the email? Check your spam folder and the address
          you entered, then try again.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 shadow-sm"
      aria-describedby="apply-form-note"
    >
      {/* Tier carries through every step via this hidden input so the
          server gets it regardless of which step rendered. */}
      <input type="hidden" name="tier" value={tier} />

      <TierBanner tierName={tierName} />

      <StepProgress current={step} />

      <h3
        ref={stepHeadingRef}
        tabIndex={-1}
        className="mt-7 font-serif text-2xl text-mppga-ink focus:outline-none"
      >
        {STEP_HEADING[step]}
      </h3>

      {/* All step containers stay mounted so their inputs are in the
          DOM at submit time. CSS hides the inactive ones; the active
          one shows. */}

      <div className={step === 1 ? "mt-5 space-y-5" : "hidden"}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ApplyField
            label="First name"
            htmlFor="apply-first-name"
            error={errors.first_name}
          >
            <input
              id="apply-first-name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              maxLength={80}
              value={values.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              className={inputClass}
            />
          </ApplyField>
          <ApplyField
            label="Last name"
            htmlFor="apply-last-name"
            error={errors.last_name}
          >
            <input
              id="apply-last-name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              maxLength={80}
              value={values.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              className={inputClass}
            />
          </ApplyField>
        </div>

        <ApplyField label="Email" htmlFor="apply-email" error={errors.email}>
          <input
            id="apply-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            className={inputClass}
          />
        </ApplyField>

        <ApplyField
          label="Phone"
          htmlFor="apply-phone"
          hint="Optional. We use it only for time-sensitive event updates."
        >
          <input
            id="apply-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="(207) 555 0142"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className={inputClass}
          />
        </ApplyField>
      </div>

      <div className={step === 2 ? "mt-5 space-y-5" : "hidden"}>
        <ApplyField label="Address" htmlFor="apply-address">
          <input
            id="apply-address"
            name="address_line"
            type="text"
            autoComplete="street-address"
            maxLength={160}
            placeholder="123 Maine Street"
            value={values.address_line}
            onChange={(e) => setField("address_line", e.target.value)}
            className={inputClass}
          />
        </ApplyField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr]">
          <ApplyField label="City" htmlFor="apply-city">
            <input
              id="apply-city"
              name="city"
              type="text"
              autoComplete="address-level2"
              maxLength={80}
              placeholder="Brunswick"
              value={values.city}
              onChange={(e) => setField("city", e.target.value)}
              className={inputClass}
            />
          </ApplyField>
          <ApplyField label="Zip" htmlFor="apply-zip">
            <input
              id="apply-zip"
              name="zip"
              type="text"
              autoComplete="postal-code"
              maxLength={20}
              placeholder="04011"
              value={values.zip}
              onChange={(e) => setField("zip", e.target.value)}
              className={inputClass}
            />
          </ApplyField>
        </div>

        <div className="rounded-lg border border-mppga-divider bg-mppga-page p-4">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="salon_owner"
              checked={effectiveOwn}
              disabled={isSalonTier}
              onChange={(e) => setOwnSalon(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40 disabled:opacity-60"
            />
            <span className="text-sm leading-relaxed text-mppga-ink">
              I own or operate a salon.
              {isSalonTier ? (
                <span className="ml-1 text-mppga-ink-muted">
                  (Required for the Salon tier.)
                </span>
              ) : (
                <span className="ml-1 text-mppga-ink-muted">
                  Tell us about it below.
                </span>
              )}
            </span>
          </label>

          {effectiveOwn ? (
            <div className="mt-5 space-y-5 border-t border-mppga-divider pt-5">
              <ApplyField
                label="Salon name"
                htmlFor="apply-salon-name"
                error={errors.salon_name}
              >
                <input
                  id="apply-salon-name"
                  name="salon_name"
                  type="text"
                  autoComplete="organization"
                  maxLength={160}
                  value={values.salon_name}
                  onChange={(e) => setField("salon_name", e.target.value)}
                  className={inputClass}
                />
              </ApplyField>

              <ApplyField label="Salon address" htmlFor="apply-salon-address">
                <input
                  id="apply-salon-address"
                  name="salon_address_line"
                  type="text"
                  autoComplete="street-address"
                  maxLength={160}
                  placeholder="Salon street address"
                  value={values.salon_address_line}
                  onChange={(e) =>
                    setField("salon_address_line", e.target.value)
                  }
                  className={inputClass}
                />
              </ApplyField>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr]">
                <ApplyField label="Salon city" htmlFor="apply-salon-city">
                  <input
                    id="apply-salon-city"
                    name="salon_city"
                    type="text"
                    autoComplete="address-level2"
                    maxLength={80}
                    value={values.salon_city}
                    onChange={(e) => setField("salon_city", e.target.value)}
                    className={inputClass}
                  />
                </ApplyField>
                <ApplyField label="Salon zip" htmlFor="apply-salon-zip">
                  <input
                    id="apply-salon-zip"
                    name="salon_zip"
                    type="text"
                    autoComplete="postal-code"
                    maxLength={20}
                    value={values.salon_zip}
                    onChange={(e) => setField("salon_zip", e.target.value)}
                    className={inputClass}
                  />
                </ApplyField>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ApplyField label="Salon phone" htmlFor="apply-salon-phone">
                  <input
                    id="apply-salon-phone"
                    name="salon_phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={values.salon_phone}
                    onChange={(e) => setField("salon_phone", e.target.value)}
                    className={inputClass}
                  />
                </ApplyField>
                <ApplyField label="Salon website" htmlFor="apply-salon-website">
                  <input
                    id="apply-salon-website"
                    name="salon_website"
                    type="url"
                    autoComplete="url"
                    maxLength={200}
                    placeholder="https://"
                    value={values.salon_website}
                    onChange={(e) =>
                      setField("salon_website", e.target.value)
                    }
                    className={inputClass}
                  />
                </ApplyField>
              </div>
            </div>
          ) : (
            <div className="mt-5 border-t border-mppga-divider pt-5">
              <ApplyField
                label="Salon you work at (optional)"
                htmlFor="apply-salon"
              >
                <SalonCombobox fieldId="apply-salon" />
              </ApplyField>
            </div>
          )}
        </div>
      </div>

      <div className={step === 3 ? "mt-5 space-y-6" : "hidden"}>
        <ReviewSummary
          tierName={tierName}
          values={values}
          ownSalon={effectiveOwn}
          onEdit={(target) => setStep(target)}
        />

        <ApplyField
          label="Create a password"
          htmlFor="apply-password"
          hint="At least 8 characters. You will use this to sign in."
          error={errors.password}
        >
          <input
            id="apply-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            className={inputClass}
          />
        </ApplyField>

        <div>
          <div className="flex items-start gap-2.5">
            <input
              id="apply-standards"
              name="standards"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
              onChange={() => {
                if (errors.standards) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.standards;
                    return next;
                  });
                }
              }}
            />
            <label
              htmlFor="apply-standards"
              className="text-xs leading-relaxed text-mppga-ink-soft"
            >
              I agree to abide by the PPGSA Standards of Care, Safety and
              Sanitation and the MPPGA Code of Ethics.
            </label>
          </div>
          {errors.standards ? (
            <p className="mt-1.5 text-xs text-red-700">{errors.standards}</p>
          ) : null}
        </div>

        {state.status === "error" ? (
          <p className="text-sm text-red-700">{state.message}</p>
        ) : null}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-mppga-divider pt-6">
        <div>
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              Back
            </Button>
          ) : (
            <span aria-hidden className="block h-10 w-1" />
          )}
        </div>
        <div>
          {step < 3 ? (
            <Button type="button" variant="primary" onClick={goNext}>
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Button>
          ) : (
            <SubmitButton />
          )}
        </div>
      </div>

      <p id="apply-form-note" className="mt-4 text-xs text-mppga-ink-muted">
        We send a verification email when you submit. Confirm your address,
        complete your dues payment, and your member portal unlocks immediately.
      </p>
    </form>
  );
}

function TierBanner({ tierName }: { tierName: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-mppga-divider bg-mppga-page px-4 py-3">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Applying as
        </p>
        <p className="mt-0.5 font-serif text-base text-mppga-ink">
          {tierName}
        </p>
      </div>
      <Link
        href="#tiers"
        className="text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
      >
        Change tier
      </Link>
    </div>
  );
}

function StepProgress({ current }: { current: StepNumber }) {
  return (
    <ol className="mt-6 grid grid-cols-3 gap-2">
      {STEPS.map((s) => {
        const isActive = s.n === current;
        const isDone = s.n < current;
        return (
          <li key={s.n} className="flex items-center gap-2.5">
            <span
              className={
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium " +
                (isActive
                  ? "bg-mppga-teal text-white"
                  : isDone
                    ? "bg-mppga-teal-tint text-mppga-teal-deep"
                    : "border border-mppga-divider bg-mppga-card text-mppga-ink-muted")
              }
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                s.n
              )}
            </span>
            <span
              className={
                "truncate text-[11px] font-medium uppercase tracking-[0.12em] " +
                (isActive || isDone
                  ? "text-mppga-ink"
                  : "text-mppga-ink-muted")
              }
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewSummary({
  tierName,
  values,
  ownSalon,
  onEdit,
}: {
  tierName: string;
  values: FormValues;
  ownSalon: boolean;
  onEdit: (step: StepNumber) => void;
}) {
  const fullName = `${values.first_name} ${values.last_name}`.trim() || "-";
  const cityZip = [values.city, values.zip].filter(Boolean).join(" ");
  const addressLines = [values.address_line, cityZip].filter(Boolean);
  return (
    <div className="rounded-lg border border-mppga-divider bg-mppga-page p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
        Your application
      </p>

      <ReviewBlock label="Tier" actionLabel={null} onAction={null}>
        <p className="text-sm text-mppga-ink">{tierName}</p>
      </ReviewBlock>

      <ReviewBlock label="About you" onAction={() => onEdit(1)}>
        <p className="text-sm text-mppga-ink">{fullName}</p>
        <p className="text-sm text-mppga-ink-soft">{values.email || "-"}</p>
        {values.phone ? (
          <p className="text-sm text-mppga-ink-soft">{values.phone}</p>
        ) : null}
      </ReviewBlock>

      <ReviewBlock label="Where you work" onAction={() => onEdit(2)}>
        {addressLines.length > 0 ? (
          addressLines.map((line) => (
            <p key={line} className="text-sm text-mppga-ink-soft">
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm text-mppga-ink-muted">No address provided.</p>
        )}

        {ownSalon ? (
          <div className="mt-3 rounded-md bg-mppga-card px-3 py-2 ring-1 ring-inset ring-mppga-divider">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
              Salon
            </p>
            <p className="mt-1 text-sm text-mppga-ink">
              {values.salon_name || "-"}
            </p>
            {(values.salon_address_line ||
              values.salon_city ||
              values.salon_zip) && (
              <p className="text-sm text-mppga-ink-soft">
                {[
                  values.salon_address_line,
                  [values.salon_city, values.salon_zip]
                    .filter(Boolean)
                    .join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        ) : null}
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({
  label,
  children,
  onAction,
  actionLabel = "Edit",
}: {
  label: string;
  children: React.ReactNode;
  onAction: (() => void) | null;
  actionLabel?: string | null;
}) {
  return (
    <div className="mt-4 border-t border-mppga-divider pt-4 first-of-type:mt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
          {label}
        </p>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Creating account..." : "Create account"}
      {pending ? null : <ArrowRight className="h-4 w-4" strokeWidth={1.8} />}
    </Button>
  );
}

function ApplyField({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-mppga-ink-muted">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-mppga-ink-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

