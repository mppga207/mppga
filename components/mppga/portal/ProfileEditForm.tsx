"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { changeEmail, updateProfile } from "@/lib/mppga/portal/actions";

interface ProfileEditFormProps {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string | null;
  initialAddressLine: string | null;
  initialCity: string | null;
  initialZip: string | null;
  email: string;
}

type Feedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function ProfileEditForm({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialAddressLine,
  initialCity,
  initialZip,
  email,
}: ProfileEditFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [addressLine, setAddressLine] = useState(initialAddressLine ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [zip, setZip] = useState(initialZip ?? "");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPending, startEmailTransition] = useTransition();
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

  function onSubmit() {
    startTransition(async () => {
      const result = await updateProfile({
        firstName,
        lastName,
        phone,
        addressLine,
        city,
        zip,
      });
      if (result.status === "ok") {
        setFeedback({ tone: "success", message: "Profile saved." });
      } else {
        setFeedback({
          tone: "error",
          message:
            result.message ?? "We couldn't save your changes. Try again in a moment.",
        });
      }
    });
  }

  function onEmailSubmit() {
    startEmailTransition(async () => {
      const result = await changeEmail({ newEmail });
      if (result.status === "ok") {
        setEmailFeedback({
          tone: "success",
          message: `Check ${newEmail.trim() || "your new inbox"} for a confirmation link. Your old email keeps working until you click it.`,
        });
        setNewEmail("");
      } else if (result.status === "unchanged") {
        setEmailFeedback({
          tone: "error",
          message: result.message ?? "That's already your email on file.",
        });
      } else {
        setEmailFeedback({
          tone: "error",
          message:
            result.message ?? "We couldn't start the email change. Try again.",
        });
      }
    });
  }

  return (
    <form action={onSubmit} className="divide-y divide-mppga-divider">
      <div className="grid grid-cols-1 gap-px bg-mppga-divider sm:grid-cols-2">
        <Field label="First name" htmlFor="profile-first-name">
          <input
            id="profile-first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            maxLength={80}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Last name" htmlFor="profile-last-name">
          <input
            id="profile-last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            maxLength={80}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="profile-email">
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="profile-email"
            type="email"
            value={email}
            disabled
            className="min-w-0 flex-1 rounded-md border border-mppga-divider bg-mppga-page px-3 py-2 text-sm text-mppga-ink-muted"
          />
          <button
            type="button"
            onClick={() => {
              setEmailOpen((v) => !v);
              setEmailFeedback(null);
            }}
            className="text-sm font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            {emailOpen ? "Cancel" : "Change email"}
          </button>
        </div>

        {emailOpen ? (
          <div className="mt-3 rounded-md border border-mppga-divider bg-mppga-page p-4">
            <label
              htmlFor="profile-new-email"
              className="block text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted"
            >
              New email
            </label>
            <input
              id="profile-new-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@newaddress.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
            />
            <p className="mt-2 text-xs text-mppga-ink-muted">
              We&rsquo;ll send a confirmation link to your new address. Until
              you click it, your old email keeps working.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p
                aria-live="polite"
                className={
                  emailFeedback?.tone === "success"
                    ? "text-sm text-mppga-teal-deep"
                    : emailFeedback?.tone === "error"
                      ? "text-sm text-mppga-teal-darker"
                      : "text-sm text-mppga-ink-muted"
                }
              >
                {emailFeedback?.message ?? " "}
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={emailPending || !newEmail}
                onClick={onEmailSubmit}
              >
                {emailPending ? "Sending…" : "Send confirmation"}
              </Button>
            </div>
          </div>
        ) : null}
      </Field>

      <Field label="Phone" htmlFor="profile-phone">
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          placeholder="(207) 555 0142"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Address" htmlFor="profile-address">
        <input
          id="profile-address"
          name="addressLine"
          type="text"
          autoComplete="street-address"
          maxLength={160}
          placeholder="123 Maine Street"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-px bg-mppga-divider sm:grid-cols-[2fr_1fr]">
        <Field label="City" htmlFor="profile-city">
          <input
            id="profile-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            maxLength={80}
            placeholder="Brunswick"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Zip" htmlFor="profile-zip">
          <input
            id="profile-zip"
            name="zip"
            type="text"
            autoComplete="postal-code"
            maxLength={20}
            placeholder="04011"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

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
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
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
