"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mic2, Play, Square } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  VOICE_MODELS,
  type VoiceModel,
  type VoiceSettings,
} from "@/lib/schemas/settings";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const MODEL_LABELS: Record<VoiceModel, string> = {
  eleven_v3: "Eleven v3 (אקספרסיבי, תגי ביטוי)",
  eleven_multilingual_v2: "Multilingual v2 (יציב)",
};

const SLIDERS: {
  key: keyof Omit<VoiceSettings, "speakerBoost">;
  label: string;
  low: string;
  high: string;
}[] = [
  { key: "stability", label: "יציבות", low: "דרמטי", high: "אחיד" },
  { key: "similarityBoost", label: "דמיון לקול המקורי", low: "חופשי", high: "נאמן" },
  { key: "style", label: "סגנון", low: "נייטרלי", high: "אקספרסיבי" },
];

export function VoiceSettingsSection() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [local, setLocal] = useState(settings.voiceSettings);
  const [model, setModel] = useState(settings.voiceModel);
  const [previewing, setPreviewing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.onended = () => setPlaying(false);
    el.onpause = () => setPlaying(false);
    audioRef.current = el;
    return () => el.pause();
  }, []);

  // Debounced persist of slider changes.
  useEffect(() => {
    if (JSON.stringify(local) === JSON.stringify(settings.voiceSettings)) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void update({ voiceSettings: local }).catch(() => toast.error("לא נשמר"));
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const changeModel = async (m: VoiceModel) => {
    setModel(m);
    try {
      await update({ voiceModel: m });
    } catch {
      toast.error("לא נשמר");
    }
  };

  const preview = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    if (!settings.voiceId) {
      toast.info("קודם בחר קול");
      return;
    }
    setPreviewing(true);
    try {
      const r = await api.post<{ url: string }>("/api/voices/preview", {
        voiceId: settings.voiceId,
        model,
        settings: local,
      });
      el.src = r.url;
      await el.play();
      setPlaying(true);
    } catch (e) {
      toast.error(
        "לא הצלחנו להפיק דוגמה",
        e instanceof ApiError ? (e.hint ?? e.message) : undefined,
      );
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <section
      aria-labelledby="voice-h"
      className="rounded-card border border-line bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="voice-h" className="text-base font-semibold">
            הקול
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {settings.voiceName ? `נבחר: ${settings.voiceName}` : "עדיין לא נבחר קול"}
          </p>
        </div>
        <Link
          href="/settings/voice"
          className="flex h-11 items-center gap-1 rounded-2xl bg-accent-soft px-3 text-sm font-medium text-accent"
        >
          <Mic2 size={16} aria-hidden />
          {settings.voiceName ? "החלף קול" : "בחר קול"}
          <ChevronLeft size={16} className="rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>

      <div className="mt-4">
        <label htmlFor="voice-model" className="text-sm font-medium">
          מודל
        </label>
        <select
          id="voice-model"
          value={model}
          onChange={(e) => void changeModel(e.target.value as VoiceModel)}
          className="mt-1.5 h-11 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm text-text"
        >
          {VOICE_MODELS.map((m) => (
            <option key={m} value={m}>
              {MODEL_LABELS[m]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          אם v3 לא זמין לחשבון, ההפקה עוברת אוטומטית ל-v2.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={`vs-${s.key}`} className="font-medium">
                {s.label}
              </label>
              <span className="font-latin text-xs text-muted tabular-nums" dir="ltr">
                {local[s.key].toFixed(2)}
              </span>
            </div>
            <input
              id={`vs-${s.key}`}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={local[s.key]}
              onChange={(e) => setLocal({ ...local, [s.key]: Number(e.target.value) })}
              className="mt-1 h-11 w-full accent-(--accent)"
            />
            <div className="flex justify-between text-[11px] text-muted-2">
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </div>
        ))}
        <label className="flex min-h-11 items-center justify-between text-sm">
          <span className="font-medium">חיזוק דובר (speaker boost)</span>
          <input
            type="checkbox"
            checked={local.speakerBoost}
            onChange={(e) => setLocal({ ...local, speakerBoost: e.target.checked })}
            className="h-5 w-5 accent-(--accent)"
          />
        </label>
      </div>

      <Button
        variant="secondary"
        className="mt-4 w-full"
        loading={previewing}
        onClick={() => void preview()}
        icon={
          playing ? (
            <Square size={16} fill="currentColor" aria-hidden />
          ) : (
            <Play size={16} fill="currentColor" aria-hidden />
          )
        }
      >
        {playing ? "עצור" : "השמע דוגמה עם ההגדרות האלה"}
      </Button>
    </section>
  );
}
