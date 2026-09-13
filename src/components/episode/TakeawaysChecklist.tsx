"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export function TakeawaysChecklist({
  episodeId,
  takeaways,
  initialDone,
  fiction,
}: {
  episodeId: string;
  takeaways: string[];
  initialDone: boolean[];
  fiction: boolean;
}) {
  const toast = useToast();
  const [done, setDone] = useState<boolean[]>(
    takeaways.map((_, i) => initialDone[i] ?? false),
  );

  if (takeaways.length === 0) {
    return <p className="text-sm text-muted">לפרק הזה לא הוגדרו צעדים.</p>;
  }

  const toggle = async (i: number) => {
    const next = done.map((d, j) => (j === i ? !d : d));
    setDone(next);
    try {
      await api.patch(`/api/episodes/${episodeId}`, { takeawaysDone: next });
    } catch {
      setDone(done);
      toast.error("לא נשמר. נסה שוב.");
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {fiction ? "שלוש שאלות למחשבה." : "שלושה צעדים לשבוע הקרוב. סמן מה עשית."}
      </p>
      <ul className="space-y-2">
        {takeaways.map((t, i) => {
          const checked = done[i] ?? false;
          return (
            <li key={i}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors ${
                  checked
                    ? "border-line-strong bg-accent-soft"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => void toggle(i)}
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    checked ? "border-accent bg-accent text-accent-ink" : "border-muted-2"
                  }`}
                >
                  {checked && <Check size={14} strokeWidth={3} />}
                </span>
                <span
                  className={`text-[15px] leading-relaxed ${checked ? "text-text-2 line-through decoration-muted-2" : ""}`}
                >
                  {t}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
