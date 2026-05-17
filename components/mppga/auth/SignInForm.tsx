"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/mppga/ui/button";
import {
  signInWithEmailPassword,
  type AuthFormState,
} from "@/lib/auth/actions";

const initial: AuthFormState = { status: "idle" };

export function SignInForm() {
  const [state, formAction] = useActionState(signInWithEmailPassword, initial);

  if (state.status === "sent") {
    return (
      <div className="mt-10 rounded-lg border border-mppga-divider bg-mppga-card p-8 text-center">
        <p className="font-serif text-xl text-mppga-ink">Almost there</p>
        <p className="mt-3 text-sm leading-relaxed text-mppga-ink-soft">
          Check your inbox at{" "}
          <span className="font-medium text-mppga-ink">{state.email}</span> to
          finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-10 space-y-5 rounded-lg border border-mppga-divider bg-mppga-card p-8"
      aria-label="Sign in form"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium text-mppga-ink-soft"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-medium text-mppga-ink-soft"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/20"
        />
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-red-700">{state.message}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" className="w-full" type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}
