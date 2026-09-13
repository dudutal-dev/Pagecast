"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function NotesEditor({
  episodeId,
  initial,
}: {
  episodeId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);
  const latest = useRef(initial);

  const save = async (text: string) => {
    setState("saving");
    try {
      await api.patch(`/api/episodes/${episodeId}`, { notes: text });
      latest.current = text;
      setState("saved");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    if (value === latest.current) return;
    setState("dirty");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(value), 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Flush on unmount / page hide.
  useEffect(() => {
    const flush = () => {
      if (value !== latest.current) {
        navigator.sendBeacon?.(
          `/api/episodes/${episodeId}`,
          new Blob([JSON.stringify({ notes: value })], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [value, episodeId]);

  const label =
    state === "saving"
      ? "שומר…"
      : state === "saved"
        ? "נשמר"
        : state === "dirty"
          ? "עריכה…"
          : state === "error"
            ? "שגיאה בשמירה"
            : "";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="notes" className="text-sm text-muted">
          מה לקחת מהפרק? מחשבות, ציטוט שלך, קישור לחיים שלך.
        </label>
        <span
          className={`text-xs ${state === "error" ? "text-danger" : "text-muted-2"}`}
          aria-live="polite"
        >
          {label}
        </span>
      </div>
      <textarea
        id="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        placeholder="כתוב כאן…"
        className="w-full resize-y rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-text placeholder:text-muted-2 focus:border-line-strong focus:outline-none"
      />
    </div>
  );
}
