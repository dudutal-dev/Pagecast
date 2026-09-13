"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer, RATES } from "@/store/player";
import { formatDuration } from "@/lib/format";

export function PlayPauseButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const toggle = usePlayer((s) => s.toggle);
  const dim = size === "lg" ? "h-16 w-16" : "h-11 w-11";
  const icon = size === "lg" ? 28 : 20;
  return (
    <button
      onClick={toggle}
      aria-label={playing ? "השהה" : "השמע"}
      className={`flex ${dim} items-center justify-center rounded-full bg-accent text-accent-ink shadow-float transition-transform hover:bg-accent-2 active:scale-95`}
    >
      {buffering && playing ? (
        <Loader2 size={icon} className="animate-spin" aria-hidden />
      ) : playing ? (
        <Pause size={icon} fill="currentColor" aria-hidden />
      ) : (
        <Play size={icon} fill="currentColor" className="ms-1" aria-hidden />
      )}
    </button>
  );
}

export function SkipButton({ dir }: { dir: "back" | "forward" }) {
  const skip = usePlayer((s) => s.skip);
  const back = dir === "back";
  const Icon = back ? RotateCcw : RotateCw;
  return (
    <button
      onClick={() => skip(back ? -15 : 30)}
      aria-label={back ? "אחורה 15 שניות" : "קדימה 30 שניות"}
      className="relative flex h-12 w-12 items-center justify-center rounded-full text-text-2 transition-all hover:bg-surface-2 hover:text-text active:scale-95"
    >
      <Icon size={26} strokeWidth={1.7} aria-hidden className="rtl:-scale-x-100" />
      <span
        className="absolute top-1/2 -translate-y-[45%] text-[9px] font-bold"
        aria-hidden
      >
        {back ? "15" : "30"}
      </span>
    </button>
  );
}

export function SpeedMenu() {
  const rate = usePlayer((s) => s.rate);
  const setRate = usePlayer((s) => s.setRate);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`מהירות ${rate}`}
        className="flex h-11 min-w-14 items-center justify-center rounded-pill border border-line px-2 font-latin text-sm font-semibold text-text-2 hover:text-text"
        dir="ltr"
      >
        {rate.toFixed(rate % 1 === 0 ? 0 : (rate * 100) % 10 === 0 ? 1 : 2)}×
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute start-0 bottom-12 z-50 flex min-w-24 flex-col overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-float"
          >
            {RATES.map((r) => (
              <li key={r} role="none">
                <button
                  role="menuitemradio"
                  aria-checked={r === rate}
                  onClick={() => {
                    setRate(r);
                    setOpen(false);
                  }}
                  dir="ltr"
                  className={`flex h-10 w-full items-center justify-center rounded-xl font-latin text-sm ${
                    r === rate
                      ? "bg-accent-soft font-semibold text-accent"
                      : "hover:bg-surface-2"
                  }`}
                >
                  {r}×
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProgressSlider({ compact = false }: { compact?: boolean }) {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? currentTime;
  const max = duration > 0 ? duration : 1;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={compact ? "" : "space-y-1"}>
      <div className="relative flex h-11 items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-3" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={0.5}
          value={value}
          aria-label="מיקום בפרק"
          aria-valuetext={formatDuration(value)}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={() => {
            if (drag != null) seek(drag);
            setDrag(null);
          }}
          onKeyUp={() => {
            if (drag != null) seek(drag);
            setDrag(null);
          }}
          className="range-input absolute inset-0 h-11 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>
      {!compact && (
        <div
          className="flex justify-between font-latin text-[11px] text-muted tabular-nums"
          dir="ltr"
        >
          <span>{formatDuration(value) || "0:00"}</span>
          <span>-{formatDuration(Math.max(0, duration - value)) || "0:00"}</span>
        </div>
      )}
    </div>
  );
}
