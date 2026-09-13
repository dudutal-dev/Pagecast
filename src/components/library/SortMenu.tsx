"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { LibrarySort } from "@/lib/schemas/episode";

const OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "newest", label: "נוסף לאחרונה" },
  { value: "title", label: "לפי כותר" },
  { value: "duration", label: "לפי משך" },
  { value: "unplayed", label: "לא הושמע קודם" },
];

export function SortMenu({
  value,
  onChange,
}: {
  value: LibrarySort;
  onChange: (v: LibrarySort) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="מיון"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-11 items-center justify-center rounded-pill border transition-colors ${
          open || value !== "newest"
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-text-2"
        }`}
      >
        <ArrowDownWideNarrow size={17} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-11 z-40 min-w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-float"
          >
            {OPTIONS.map((o) => (
              <li key={o.value} role="none">
                <button
                  role="menuitemradio"
                  aria-checked={value === o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-start text-sm hover:bg-surface-2"
                >
                  {o.label}
                  {value === o.value && (
                    <Check size={16} className="text-accent" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
