"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { changeEmail } from "@/lib/mppga/portal/actions";

interface EmailChangeFormProps {
  currentEmail: string;
}

type Feedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function onSubmit() {
    startTransition(async () => {
      const result = await changeEmail({ newEmail });
      if (result.status === "ok") {
        setFeedback({
          tone: "success",
          message: `Check ${newEmail.trim() || "your new inbox"} for a confirmation link. Your old email stays active until you click it.`,
        });
        setNewEmail("");
      } else if (result.status === "unchanged") {
        setFeedback({
          tone: "error",
          message: result.message ?? "That's already your email on file.",
        });
      } else {
        setFeedback({
          tone: "error",
          message:
            result.message ?? "We couldn't start the email change. Try again.",
        });
      }
    });
  }

  return (
    <form action={onSubmit} className="divide-y divide-mppga-divider">
      <div className="px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          Current email
        </p>
        <p className="mt-2 text-sm text-mppga-ink">{currentEmail}</p>
      </div>

      <div className="px-6 py-4">
        <label
          htmlFor="email-change-new"
          className="block text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted"
        >
          New email
        </label>
        <input
          id="email-change-new"
          name="newEmail"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="you@newaddress.com"
          className="mt-2 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal-tint"
        />
        <p className="mt-2 text-xs text-mppga-ink-muted">
          We&rsquo;ll send a confirmation link to your new address. Until you
          click it, your old email keeps working.
        </p>
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
        <Button type="submit" variant="primary" disabled={pending || !newEmail}>
          {pending ? "Sending…" : "Send confirmation"}
        </Button>
      </div>
    </form>
  );
}
