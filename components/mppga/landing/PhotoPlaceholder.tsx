import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "teal" | "sand" | "deep";

type PhotoPlaceholderProps = {
  label: string;
  tone?: Tone;
  className?: string;
  rounded?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
};

const toneStyles: Record<Tone, { base: string; gradient: string }> = {
  teal: {
    base: "bg-mppga-teal-tint",
    gradient:
      "radial-gradient(110% 80% at 70% 18%, rgba(71,115,118,0.30), transparent 60%), radial-gradient(80% 60% at 20% 85%, rgba(201,169,97,0.18), transparent 60%)",
  },
  sand: {
    base: "bg-mppga-sand-deep",
    gradient:
      "radial-gradient(110% 80% at 30% 20%, rgba(201,169,97,0.30), transparent 60%), radial-gradient(80% 60% at 80% 85%, rgba(71,115,118,0.20), transparent 60%)",
  },
  deep: {
    base: "bg-mppga-teal-deep",
    gradient:
      "radial-gradient(120% 90% at 75% 20%, rgba(201,169,97,0.32), transparent 60%), radial-gradient(80% 70% at 15% 90%, rgba(71,115,118,0.55), transparent 60%)",
  },
};

export function PhotoPlaceholder({
  label,
  tone = "teal",
  className,
  rounded = "rounded-2xl",
  showIcon = true,
  children,
}: PhotoPlaceholderProps) {
  const t = toneStyles[tone];
  const labelInk = tone === "deep" ? "text-white/70" : "text-mppga-ink-muted";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        rounded,
        t.base,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn("absolute inset-0", rounded)}
        style={{ background: t.gradient }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-40",
          rounded,
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      {showIcon ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            aria-hidden
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-sm",
              tone === "deep"
                ? "border-white/25 bg-white/10 text-white/80"
                : "border-mppga-divider bg-white/60 text-mppga-teal",
            )}
          >
            <ImageIcon className="h-5 w-5" strokeWidth={1.6} />
          </span>
        </div>
      ) : null}

      {children}

      <span
        className={cn(
          "pointer-events-none absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.18em]",
          labelInk,
        )}
      >
        {label}
      </span>
    </div>
  );
}
