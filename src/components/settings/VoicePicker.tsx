"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Square,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { RankedVoice } from "@/server/services/narration/voices";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";

interface VoicesResponse {
  voices: RankedVoice[];
  selectedVoiceId: string | null;
  eligible: number;
}

export function VoicePicker() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [data, setData] = useState<VoicesResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<VoicesResponse>(`/api/voices${refresh ? "?refresh=1" : ""}`));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, { message: String(e) }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = new Audio();
    el.preload = "none";
    el.onended = () => setPlayingId(null);
    el.onpause = () => setPlayingId(null);
    audioRef.current = el;
    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, []);

  const preview = async (v: RankedVoice) => {
    const el = audioRef.current;
    if (!el) return;
    if (playingId === v.voiceId) {
      el.pause();
      return;
    }
    setPreviewing(v.voiceId);
    try {
      const r = await api.post<{ url: string; cached: boolean; model: string }>(
        "/api/voices/preview",
        {
          voiceId: v.voiceId,
        },
      );
      el.src = r.url;
      await el.play();
      setPlayingId(v.voiceId);
      if (!r.cached && r.model !== settings.voiceModel) {
        toast.info("המודל שנבחר לא זמין לחשבון", `הדוגמה הופקה עם ${r.model}`);
      }
    } catch (e) {
      toast.error(
        "לא הצלחנו להפיק דוגמה",
        e instanceof ApiError ? (e.hint ?? e.message) : undefined,
      );
    } finally {
      setPreviewing(null);
    }
  };

  const choose = async (v: RankedVoice) => {
    setSaving(v.voiceId);
    try {
      await update({ voiceId: v.voiceId, voiceName: v.name });
      toast.success(`נבחר הקול ${v.name}`);
    } catch (e) {
      toast.error("לא נשמר", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(null);
    }
  };

  const eligible = data?.voices.filter((v) => v.female && v.hebrewCapable) ?? [];
  const others = data?.voices.filter((v) => !(v.female && v.hebrewCapable)) ?? [];
  const list = showAll ? [...eligible, ...others] : eligible;

  return (
    <>
      <PageHeader
        title="בחירת קול"
        subtitle="הפק דוגמה של 20 שניות בעברית לכל קול, ובחר בהאזנה"
        actions={
          <button
            onClick={() => void load(true)}
            aria-label="רענן רשימת קולות"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} aria-hidden />
          </button>
        }
      >
        <div className="px-4 pb-3 md:px-6">
          <Link
            href="/settings"
            className="inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-text"
          >
            <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden />
            להגדרות
          </Link>
        </div>
      </PageHeader>

      <div className="px-4 pt-4 md:px-6">
        {loading && !data ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <CardSkeleton />
              </li>
            ))}
          </ul>
        ) : error ? (
          <EmptyState
            icon={<KeyRound size={30} />}
            title={
              error.code === "NO_API_KEY"
                ? "חסר מפתח ElevenLabs"
                : "לא הצלחנו למשוך קולות"
            }
            body={error.hint ?? error.message}
            action={
              <Button variant="secondary" onClick={() => void load(true)}>
                נסה שוב
              </Button>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={30} />}
            title="לא נמצאו קולות נשיים מתאימים"
            body="אפשר להציג את כל הקולות בחשבון ולבחור ידנית."
            action={<Button onClick={() => setShowAll(true)}>הצג את כל הקולות</Button>}
          />
        ) : (
          <>
            <ul className="space-y-3">
              {list.map((v) => {
                const selected = settings.voiceId === v.voiceId;
                const isPlaying = playingId === v.voiceId;
                return (
                  <li
                    key={v.voiceId}
                    className={`rounded-card border p-4 transition-colors ${
                      selected ? "border-accent bg-accent-soft" : "border-line bg-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{v.name}</h3>
                          {v.recommended && <Tag>מומלץ</Tag>}
                          {selected && <Tag>נבחר</Tag>}
                        </div>
                        <p className="mt-0.5 text-xs text-accent">{v.reason}</p>
                        {v.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted" dir="auto">
                            {v.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-2" dir="ltr">
                          {Object.entries(v.labels)
                            .slice(0, 4)
                            .map(([k, val]) => `${k}: ${val}`)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        loading={previewing === v.voiceId}
                        onClick={() => void preview(v)}
                        icon={
                          isPlaying ? (
                            <Square size={16} fill="currentColor" aria-hidden />
                          ) : (
                            <Play size={16} fill="currentColor" aria-hidden />
                          )
                        }
                      >
                        {isPlaying ? "עצור" : "הפק דוגמה"}
                      </Button>
                      <Button
                        className="flex-1"
                        variant={selected ? "secondary" : "primary"}
                        disabled={selected}
                        loading={saving === v.voiceId}
                        onClick={() => void choose(v)}
                        icon={selected ? <Check size={16} aria-hidden /> : undefined}
                      >
                        {selected ? "נבחר" : "בחר"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!showAll && others.length > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl text-sm text-muted hover:bg-surface-2 hover:text-text"
              >
                הצג גם {others.length} קולות אחרים בחשבון
              </button>
            )}
            {loading && (
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                <Loader2 size={14} className="animate-spin" aria-hidden /> מרענן…
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
