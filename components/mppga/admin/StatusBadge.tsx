import { cn } from "@/lib/cn";

type Tone = "teal" | "neutral" | "warn" | "muted";

const tones: Record<Tone, string> = {
  teal: "bg-mppga-teal-tint text-mppga-teal-deep",
  neutral: "bg-mppga-page text-mppga-ink-soft border border-mppga-divider",
  warn: "bg-mppga-sand text-mppga-teal-darker",
  muted: "bg-mppga-page text-mppga-ink-muted border border-mppga-divider",
};

type StatusBadgeProps = {
  label: string;
  tone?: Tone;
  className?: string;
};

export function StatusBadge({ label, tone = "teal", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
