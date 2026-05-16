"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/mppga/ui/button";
import {
  removeLogoAction,
  uploadLogoAction,
} from "@/lib/admin/branding-actions";

export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  return (
    <section>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        Logo
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-5 rounded-md border border-dashed border-mppga-divider p-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Current MPPGA logo"
            className="h-20 w-20 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-mppga-teal font-serif text-3xl text-white">
            M
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-mppga-ink">
            {logoUrl ? "Current logo" : "Placeholder mark"}
          </p>
          <p className="mt-1 text-sm text-mppga-ink-soft">
            PNG / JPG / SVG / WebP up to 2 MB. Transparent background
            recommended.
          </p>
          {pickedName ? (
            <p className="mt-2 truncate font-mono text-xs text-mppga-teal-deep">
              Picked: {pickedName}
            </p>
          ) : null}
        </div>
        <form action={uploadLogoAction} className="flex items-center gap-3">
          <label
            htmlFor="logo-upload"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-mppga-teal px-4 text-sm font-medium text-mppga-teal transition-colors hover:bg-mppga-teal-tint"
          >
            <Upload className="h-4 w-4" strokeWidth={1.8} />
            Choose file
          </label>
          <input
            id="logo-upload"
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            required
            onChange={(e) =>
              setPickedName(e.target.files?.[0]?.name ?? null)
            }
            className="sr-only"
          />
          <Button type="submit" disabled={!pickedName}>
            Upload
          </Button>
        </form>
      </div>
      {logoUrl ? (
        <form
          action={removeLogoAction}
          onSubmit={(e) => {
            if (!confirm("Remove the current logo and revert to the placeholder?")) {
              e.preventDefault();
            }
          }}
          className="mt-3 flex justify-end"
        >
          <Button type="submit" variant="ghost">
            Remove logo
          </Button>
        </form>
      ) : null}
    </section>
  );
}
