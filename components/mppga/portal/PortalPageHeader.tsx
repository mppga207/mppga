import type { ReactNode } from "react";

type PortalPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PortalPageHeader({
  eyebrow = "Member dashboard",
  title,
  description,
  actions,
}: PortalPageHeaderProps) {
  return (
    <header className="border-b border-mppga-divider pb-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-mppga-ink md:text-5xl">
            {title}
            <span className="text-mppga-ink">.</span>
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-mppga-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
