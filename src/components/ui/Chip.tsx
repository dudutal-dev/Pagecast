"use client";

import type { ButtonHTMLAttributes } from "react";

export function Chip({
  selected,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3.5 text-[13px] font-medium whitespace-nowrap transition-all active:scale-[0.97] ${
        selected
          ? "border-accent bg-accent text-accent-ink shadow-sm"
          : "border-line bg-surface text-text-2 hover:border-line-strong hover:text-text"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-pill bg-accent-soft px-2 text-[11px] font-medium text-accent ${className}`}
    >
      {children}
    </span>
  );
}
