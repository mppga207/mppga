import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, description, children, className }: CardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-mppga-divider bg-mppga-card",
        className,
      )}
    >
      {title || description ? (
        <header className="border-b border-mppga-divider px-6 py-5">
          {title ? (
            <h2 className="font-serif text-xl text-mppga-ink">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-mppga-ink-soft">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
