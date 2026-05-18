"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { updateSalonInfo } from "@/lib/mppga/portal/actions";
import type { OwnedSalonInfo } from "@/lib/mppga/portal/data";

interface SalonInfoFormProps {
  /**
   * The user's current owned salon, if any. Null when they aren't a
   * salon owner yet — saving from that state creates a new
   * organization and pins them as primary contact.
   */
  salon: OwnedSalonInfo | null;
  /**
   * True for Salon-tier members. The toggle stays on and the
   * info-fields stay visible regardless of state because they're
   * always required.
   */
  forced: boolean;
  /**
   * Name of an organization the user is affiliated with but does NOT
   * own. Shown as a read-only note so they understand turning on the
   * owner toggle will create a separate salon (not edit that one).
   */
  affiliatedSalonName: string | null;
}

type Feedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function SalonInfoForm({
  salon,
  forced,
  affiliatedSalonName,
}: SalonInfoFormProps) {
  const [enabled, setEnabled] = useState(forced || salon !== null);
  const [name, setName] = useState(salon?.name ?? "");
  const [addressLine, setAddressLine] = useState(salon?.addressLine ?? "");
  const [city, setCity] = useState(salon?.city ?? "");
  const [zip, setZip] = useState(salon?.zip ?? "");
  const [phone, setPhone] = useState(salon?.phone ?? "");
  const [website, setWebsite] = useState(salon?.website ?? "");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function onSubmit() {
    startTransition(async () => {
      const result = await updateSalonInfo({
        organizationId: salon?.id ?? null,
        name,
        addressLine,
        city,
        zip,
        phone,
        website,
      });
      if (result.status === "ok") {
        setFeedback({
          tone: "success",
          message: salon ? "Salon details saved." : "Salon added.",
        });
      } else {
        setFeedback({
          tone: "error",
          message:
            result.message ?? "We couldn't save your salon. Try again in a moment.",
        });
      }
    });
  }

  return (
    <form action={onSubmit} className="divide-y divide-mppga-divider">
      <div className="px-6 py-4">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={enabled}
            disabled={forced}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40 disabled:opacity-60"
          />
          <span className="text-sm leading-relaxed text-mppga-ink">
            I own or operate a salon.
            {forced ? (
              <span className="ml-1 text-mppga-ink-muted">
                (Required for the Salon tier.)
              </span>
            ) : null}
          </span>
        </label>
        {!forced && affiliatedSalonName && !salon ? (
          <p className="mt-2 text-xs text-mppga-ink-muted">
            You&rsquo;re currently affiliated with{" "}
            <span className="font-medium text-mppga-ink">{affiliatedSalonName}</span>.
            Turning this on creates a separate salon record under your name.
          </p>
        ) : null}
      </div>

      {enabled ? (
        <>
          <Field label="Salon name" htmlFor="salon-name">
            <input
              id="salon-name"
              type="text"
              autoComplete="organization"
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Address" htmlFor="salon-address">
            <input
              id="salon-address"
              type="text"
              autoComplete="street-address"
              maxLength={160}
              placeholder="Salon street address"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-px bg-mppga-divider sm:grid-cols-[2fr_1fr]">
            <Field label="City" htmlFor="salon-city">
              <input
                id="salon-city"
                type="text"
                autoComplete="address-level2"
                maxLength={80}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Zip" htmlFor="salon-zip">
              <input
                id="salon-zip"
                type="text"
                autoComplete="postal-code"
                maxLength={20}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Phone" htmlFor="salon-phone">
            <input
              id="salon-phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Website" htmlFor="salon-website">
            <input
              id="salon-website"
              type="url"
              autoComplete="url"
              maxLength={200}
              placeholder="https://"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p
              aria-live="polite"
              className={
                feedback?.tone === "success"
                  ? "text-sm text-mppga-teal-deep"
                  : feedback?.tone === "error"
                    ? "text-sm text-mppga-teal-darker"
                    : "text-sm text-mppga-ink-muted"
              }
            >
              {feedback?.message ?? " "}
            </p>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : salon ? "Save salon" : "Add salon"}
            </Button>
          </div>
        </>
      ) : (
        <div className="px-6 py-4 text-sm text-mppga-ink-muted">
          Check the box above to add your salon&rsquo;s details.
        </div>
      )}
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint";

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
    <div className="bg-mppga-card px-6 py-4">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted"
      >
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
