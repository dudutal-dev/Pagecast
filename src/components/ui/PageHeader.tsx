import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="flex items-end justify-between gap-3 px-4 pt-4 pb-3 md:px-6">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
