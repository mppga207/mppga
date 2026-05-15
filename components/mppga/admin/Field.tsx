import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  helper?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, helper, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        {label}
      </span>
      {helper ? (
        <span className="mt-1 block text-sm text-mppga-ink-soft">{helper}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm text-mppga-ink shadow-sm transition-colors focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
    />
  );
}

type TextAreaProps = TextInputProps & { rows?: number };

export function TextArea({ value, onChange, placeholder, rows = 4 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm leading-relaxed text-mppga-ink shadow-sm transition-colors focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
    />
  );
}
