"use client";

import { useState, type ReactNode } from "react";

export function CopyButton({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write can fail on insecure contexts. Surface nothing;
      // the audit log still has the value, and admins can also see it
      // inline on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-mppga-teal hover:text-mppga-teal-hover"
    >
      {copied ? "Copied" : children}
    </button>
  );
}
