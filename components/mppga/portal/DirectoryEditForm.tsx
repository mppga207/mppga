"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { updateDirectoryListing } from "@/lib/mppga/portal/actions";

interface DirectoryEditFormProps {
  initialDisplayName: string;
  initialBio: string | null;
  initialBusinessPhone: string | null;
  initialPersonalMobile: string | null;
  initialPublicEmail: string | null;
  initialSpecialties: string[];
}

export function DirectoryEditForm({
  initialDisplayName,
  initialBio,
  initialBusinessPhone,
  initialPersonalMobile,
  initialPublicEmail,
  initialSpecialties,
}: DirectoryEditFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [businessPhone, setBusinessPhone] = useState(initialBusinessPhone ?? "");
  const [personalMobile, setPersonalMobile] = useState(initialPersonalMobile ?? "");
  const [publicEmail, setPublicEmail] = useState(initialPublicEmail ?? "");
  const [specialtiesText, setSpecialtiesText] = useState(
    initialSpecialties.join(", "),
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);

  function onSubmit() {
    startTransition(async () => {
      const result = await updateDirectoryListing({
        displayName,
        bio,
        businessPhone,
        personalMobile,
        publicEmail,
        specialties: specialtiesText.split(",").map((s) => s.trim()),
      });
      if (result.status === "ok") {
        setFeedback({ tone: "success", message: "Listing saved." });
      } else {
        setFeedback({
          tone: "error",
          message:
            result.message ?? "We couldn't save your listing. Try again.",
        });
      }
    });
  }

  return (
    <form action={onSubmit} className="divide-y divide-mppga-divider">
      <Field label="Display name" htmlFor="dl-display-name">
        <input
          id="dl-display-name"
          type="text"
          required
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
        <p className="mt-1 text-xs text-mppga-ink-muted">
          What the public sees at the top of your listing.
        </p>
      </Field>

      <Field label="Bio" htmlFor="dl-bio">
        <textarea
          id="dl-bio"
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
        <p className="mt-1 text-xs text-mppga-ink-muted">
          {bio.length}/500
        </p>
      </Field>

      <Field label="Business phone" htmlFor="dl-business-phone">
        <input
          id="dl-business-phone"
          type="tel"
          maxLength={40}
          value={businessPhone}
          onChange={(e) => setBusinessPhone(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
      </Field>

      <Field label="Personal mobile" htmlFor="dl-personal-mobile">
        <input
          id="dl-personal-mobile"
          type="tel"
          maxLength={40}
          value={personalMobile}
          onChange={(e) => setPersonalMobile(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
        <p className="mt-1 text-xs text-mppga-ink-muted">
          Stored either way. Use the toggle on this page to choose whether
          to show it publicly.
        </p>
      </Field>

      <Field label="Public email" htmlFor="dl-public-email">
        <input
          id="dl-public-email"
          type="email"
          maxLength={254}
          value={publicEmail}
          onChange={(e) => setPublicEmail(e.target.value)}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
      </Field>

      <Field label="Specialties" htmlFor="dl-specialties">
        <input
          id="dl-specialties"
          type="text"
          value={specialtiesText}
          onChange={(e) => setSpecialtiesText(e.target.value)}
          placeholder="Hand stripping, doodle cuts, cat grooming"
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
        <p className="mt-1 text-xs text-mppga-ink-muted">
          Comma-separated. Up to 20 tags, 60 characters each.
        </p>
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
