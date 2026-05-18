"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

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

export function JoinForm({
  tiers,
  defaultTier = "professional",
}: {
  tiers: TierOption[];
  defaultTier?: TierOption["slug"];
}) {
  const [state, formAction] = useActionState(joinMembership, initial);
  const [tier, setTier] = useState<TierOption["slug"]>(defaultTier);
  // Per-tier behavior:
  //   - Salon-tier signups ARE the salon: the toggle is locked on and
  //     the affiliation combobox is hidden.
  //   - Other tiers: optional "I own a salon" toggle. When off, the
  //     existing-salon combobox lets them affiliate as an employee.
  const isSalonTier = tier === "salon";
  const [ownSalon, setOwnSalon] = useState(false);
  const effectiveOwn = isSalonTier || ownSalon;

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-mppga-divider bg-mppga-card p-7 text-center shadow-sm">
        <p className="font-serif text-2xl text-mppga-ink">Check your email</p>
        <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
          We sent a verification email to{" "}
          <span className="font-medium text-mppga-ink">{state.email}</span>.
          Confirm your address to finish creating your account. You’ll land
          on your dashboard with a one-time dues payment to complete.
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ApplyField label="First name" htmlFor="apply-first-name">
            <input
              id="apply-first-name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              required
              maxLength={80}
              className={inputClass}
            />
          </ApplyField>

          <ApplyField label="Last name" htmlFor="apply-last-name">
            <input
              id="apply-last-name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              required
              maxLength={80}
              className={inputClass}
            />
          </ApplyField>
        </div>

        <ApplyField label="Email" htmlFor="apply-email">
          <input
            id="apply-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </ApplyField>

        <ApplyField label="Password" htmlFor="apply-password">
          <input
            id="apply-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
          />
        </ApplyField>

        <ApplyField label="Phone" htmlFor="apply-phone">
          <input
            id="apply-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="(207) 555 0142"
            className={inputClass}
          />
        </ApplyField>

        <ApplyField label="Address" htmlFor="apply-address">
          <input
            id="apply-address"
            name="address_line"
            type="text"
            autoComplete="street-address"
            maxLength={160}
            placeholder="123 Maine Street"
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
              className={inputClass}
            />
          </ApplyField>
        </div>

        <ApplyField label="Tier" htmlFor="apply-tier">
          <select
            id="apply-tier"
            name="tier"
            value={tier}
            onChange={(event) =>
              setTier(event.target.value as TierOption["slug"])
            }
            className={inputClass}
          >
            {tiers.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </ApplyField>

        <div className="rounded-lg border border-mppga-divider bg-mppga-page p-4">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="salon_owner"
              checked={effectiveOwn}
              disabled={isSalonTier}
              onChange={(event) => setOwnSalon(event.target.checked)}
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
              <ApplyField label="Salon name" htmlFor="apply-salon-name">
                <input
                  id="apply-salon-name"
                  name="salon_name"
                  type="text"
                  autoComplete="organization"
                  required
                  maxLength={160}
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
                    className={inputClass}
                  />
                </ApplyField>
              </div>
            </div>
          ) : null}
        </div>

        {!effectiveOwn ? (
          <ApplyField
            label="Salon you work at (optional)"
            htmlFor="apply-salon"
          >
            <SalonCombobox fieldId="apply-salon" />
          </ApplyField>
        ) : null}

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
          We’ll send a verification email. Confirm your address, complete
          your dues payment, and your member portal unlocks immediately.
        </p>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
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
