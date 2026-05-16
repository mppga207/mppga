import { loadSiteLogo } from "@/lib/admin/branding-data";

/**
 * Renders the org logo when one has been uploaded; falls back to the
 * placeholder "M" chip otherwise. Server component — reads the
 * Supabase Storage URL through a per-request cache (`loadSiteLogo`),
 * so duplicate renders on the same page issue at most one select.
 *
 * Per brand.md §3: don't invent a logo. The "M" placeholder is the
 * canonical fallback until the client supplies an asset (and now,
 * uploads it via /admin/settings).
 */
export interface BrandLogoProps {
  /** Square edge length in px. Default 36 (h-9 w-9). */
  size?: number;
  alt?: string;
  className?: string;
}

export async function BrandLogo({
  size = 36,
  alt = "MPPGA logo",
  className,
}: BrandLogoProps) {
  const { logoUrl } = await loadSiteLogo();
  const wrapperClass =
    className ??
    "flex items-center justify-center rounded-md bg-mppga-teal text-white font-serif text-lg";
  const sideStyle = { width: size, height: size } as const;

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={alt}
        style={sideStyle}
        className="rounded-md object-contain"
      />
    );
  }

  return (
    <span style={sideStyle} className={wrapperClass} aria-label={alt}>
      M
    </span>
  );
}
