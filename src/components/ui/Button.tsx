"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-float hover:bg-accent-2 active:scale-[0.98] disabled:bg-surface-3 disabled:text-muted disabled:shadow-none",
  secondary:
    "bg-surface-2 text-text border border-line hover:bg-surface-3 active:scale-[0.98] disabled:text-muted",
  ghost:
    "text-text-2 hover:bg-surface-2 hover:text-text active:scale-[0.98] disabled:text-muted",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/10 active:scale-[0.98] disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-2xl",
  lg: "h-13 px-6 text-base gap-2 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    icon,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex min-w-11 items-center justify-center font-medium transition-all duration-150 select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className = "",
  children,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 ${
        active
          ? "bg-accent-soft text-accent"
          : "text-text-2 hover:bg-surface-2 hover:text-text"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
