import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-line-strong bg-accent-soft text-accent">
        {icon}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
