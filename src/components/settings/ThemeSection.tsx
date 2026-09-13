"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { THEMES, type Theme } from "@/lib/schemas/settings";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useToast } from "@/components/ui/Toast";

const LABELS: Record<Theme, { label: string; icon: typeof Sun }> = {
  auto: { label: "אוטומטי", icon: SunMoon },
  dark: { label: "כהה", icon: Moon },
  light: { label: "בהיר", icon: Sun },
};

export function ThemeSection() {
  const { settings, update } = useSettings();
  const toast = useToast();
  return (
    <section
      aria-labelledby="theme-h"
      className="rounded-card border border-line bg-surface p-4"
    >
      <h2 id="theme-h" className="text-base font-semibold">
        מראה
      </h2>
      <p className="mt-0.5 text-sm text-muted">ערכת נושא כהה, בהירה, או לפי המכשיר.</p>
      <div
        role="radiogroup"
        aria-label="ערכת נושא"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {THEMES.map((t) => {
          const { label, icon: Icon } = LABELS[t];
          const selected = settings.theme === t;
          return (
            <button
              key={t}
              role="radio"
              aria-checked={selected}
              onClick={() =>
                void update({ theme: t }).catch((e) =>
                  toast.error("לא נשמר", e instanceof Error ? e.message : undefined),
                )
              }
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition-all active:scale-[0.98] ${
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface-2 text-text-2 hover:border-line-strong"
              }`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
