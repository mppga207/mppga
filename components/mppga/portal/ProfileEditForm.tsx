"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { updateProfile } from "@/lib/mppga/portal/actions";

interface ProfileEditFormProps {
  initialFullName: string;
  initialPhone: string | null;
  email: string;
}

export function ProfileEditForm({
  initialFullName,
  initialPhone,
  email,
}: ProfileEditFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { tone: "success" | "error"; message: string }
    | null
  >(null);

  function onSubmit(formData: FormData) {
    const nextFullName = String(formData.get("fullName") ?? "");
    const nextPhone = String(formData.get("phone") ?? "");
    startTransition(async () => {
      const result = await updateProfile({
        fullName: nextFullName,
        phone: nextPhone,
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

  return (
    <form action={onSubmit} className="divide-y divide-mppga-divider">
      <Field label="Full name" htmlFor="profile-full-name">
        <input
          id="profile-full-name"
          name="fullName"
          type="text"
          required
          maxLength={120}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
      </Field>

      <Field label="Email" htmlFor="profile-email">
        <input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className="w-full rounded-md border border-mppga-divider bg-mppga-page px-3 py-2 text-sm text-mppga-ink-muted"
        />
        <p className="mt-1 text-xs text-mppga-ink-muted">
          Your sign-in email. Change it below.
        </p>
      </Field>

      <Field label="Phone" htmlFor="profile-phone">
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
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
          {feedback?.message ?? " "}
        </p>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

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
    <div className="px-6 py-4">
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
