"use client";

import { useId, useRef } from "react";
import { motion } from "framer-motion";

export interface TabItem<K extends string> {
  key: K;
  label: string;
}

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (k: K) => void;
  className?: string;
}) {
  const id = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const idx = items.findIndex((i) => i.key === value);
    // RTL: ArrowLeft moves to the next tab visually (which is the next item).
    const delta = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = items[(idx + delta + items.length) % items.length]!;
    onChange(next.key);
    refs.current[next.key]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="לשוניות הפרק"
      onKeyDown={onKey}
      className={`no-scrollbar flex gap-1 overflow-x-auto border-b border-line ${className}`}
    >
      {items.map((it) => {
        const selected = it.key === value;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[it.key] = el;
            }}
            role="tab"
            id={`${id}-tab-${it.key}`}
            aria-selected={selected}
            aria-controls={`${id}-panel-${it.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.key)}
            className={`relative h-11 shrink-0 px-3.5 text-[15px] font-medium transition-colors ${
              selected ? "text-text" : "text-muted hover:text-text-2"
            }`}
          >
            {it.label}
            {selected && (
              <motion.span
                layoutId={`${id}-underline`}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
