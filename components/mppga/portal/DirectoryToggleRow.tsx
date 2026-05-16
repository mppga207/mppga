"use client";

import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/mppga/admin/StatusBadge";
import {
  toggleDirectoryFlag,
  type DirectoryToggleFlag,
} from "@/lib/mppga/portal/actions";

interface DirectoryToggleRowProps {
  flag: DirectoryToggleFlag;
  label: string;
  initial: boolean;
  /**
   * When true, flipping the toggle from off → on surfaces a confirmation
   * prompt before saving. Per directory-search.md §5.4: required for
   * personal mobile and street address.
   */
  confirmOnEnable?: boolean;
  confirmMessage?: string;
}

export function DirectoryToggleRow({
  flag,
  label,
  initial,
  confirmOnEnable = false,
  confirmMessage,
}: DirectoryToggleRowProps) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !on;
    if (next && confirmOnEnable) {
      const ok = window.confirm(
        confirmMessage ??
          "This will be visible to anyone who finds your listing. Continue?",
      );
      if (!ok) return;
    }
    setError(null);
    setOn(next);
    startTransition(async () => {
      const result = await toggleDirectoryFlag({ flag, value: next });
      if (result.status !== "ok") {
        setOn(!next);
        setError(result.message ?? "Couldn't save that change.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-sm text-mppga-ink">{label}</p>
        {error ? (
          <p className="mt-1 text-xs text-mppga-teal-darker">{error}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge
          label={on ? "Visible" : "Hidden"}
          tone={on ? "teal" : "muted"}
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          aria-pressed={on}
          aria-label={`Toggle ${label}`}
          className={
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
            (on ? "bg-mppga-teal" : "bg-mppga-divider")
          }
        >
          <span
            aria-hidden
            className={
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
              (on ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
      </div>
    </div>
  );
}
