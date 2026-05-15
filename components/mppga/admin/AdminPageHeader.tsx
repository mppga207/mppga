import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="border-b border-mppga-divider pb-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
        Admin
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight text-mppga-ink md:text-5xl">
        {title}
        <span className="text-mppga-ink">.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-mppga-ink-soft">
        {description}
      </p>
      {actions ? <div className="mt-6">{actions}</div> : null}
    </header>
  );
}
