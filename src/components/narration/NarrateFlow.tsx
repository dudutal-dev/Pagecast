"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Loader2,
  Mic2,
  Play,
  RotateCcw,
  Save,
  Wand2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { EpisodeWithAudio } from "@/server/services/episodes";
import type {
  NarrationEstimate,
  ProduceProgress,
  ProduceResult,
} from "@/server/services/narration/produce";
import { streamSse } from "@/hooks/useSse";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

type Phase = "idle" | "directing" | "producing" | "done";

export function NarrateFlow({ initial }: { initial: EpisodeWithAudio }) {
  const { settings } = useSettings();
  const toast = useToast();
  const router = useRouter();
  const [performed, setPerformed] = useState(initial.performedScript ?? "");
  const [savedPerformed, setSavedPerformed] = useState(initial.performedScript ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [directorLive, setDirectorLive] = useState("");
  const [estimate, setEstimate] = useState<NarrationEstimate | null>(null);
  const [progress, setProgress] = useState<ProduceProgress | null>(null);
  const [result, setResult] = useState<ProduceResult | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef<HTMLPreElement>(null);

  const dirty = performed !== savedPerformed;

  const loadEstimate = useCallback(async () => {
    try {
      setEstimate(
        await api.get<NarrationEstimate>(`/api/episodes/${initial.id}/narrate/estimate`),
      );
    } catch {
      /* estimate is best-effort */
    }
  }, [initial.id]);

  useEffect(() => {
    void loadEstimate();
  }, [
    loadEstimate,
    savedPerformed,
    settings.voiceId,
    settings.voiceModel,
    settings.voiceSettings,
  ]);

  useEffect(() => {
    liveRef.current?.scrollTo({ top: liveRef.current.scrollHeight });
  }, [directorLive]);

  const runDirector = async () => {
    setPhase("directing");
    setError(null);
    setDirectorLive("");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamSse(
        `/api/episodes/${initial.id}/direct`,
        {},
        (e) => {
          if (e.event === "delta")
            setDirectorLive((t) => t + (e.data as { text: string }).text);
          else if (e.event === "done") {
            const d = e.data as { performedScript: string };
            setPerformed(d.performedScript);
            setSavedPerformed(d.performedScript);
            toast.success("הבמאי סיים", "עבור על התסריט, ערוך אם צריך, ואז הפק.");
          } else if (e.event === "error") {
            const d = e.data as { message: string; hint?: string };
            setError(d);
          }
        },
        ac.signal,
      );
    } catch (e) {
      setError({
        message: e instanceof ApiError ? e.message : "שגיאה",
        hint: e instanceof ApiError ? e.hint : undefined,
      });
    } finally {
      setPhase("idle");
      abortRef.current = null;
    }
  };

  const savePerformed = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/episodes/${initial.id}`, {
        performedScript: performed.trim() || null,
      });
      setSavedPerformed(performed);
      toast.success("התסריט נשמר");
    } catch (e) {
      toast.error("לא נשמר", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const produce = async (force = false) => {
    if (dirty) await savePerformed();
    setPhase("producing");
    setError(null);
    setProgress(null);
    setResult(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamSse(
        `/api/episodes/${initial.id}/narrate`,
        { force },
        (e) => {
          if (e.event === "progress") setProgress(e.data as ProduceProgress);
          else if (e.event === "done") {
            setResult(e.data as ProduceResult);
            setPhase("done");
            router.refresh();
          } else if (e.event === "error")
            setError(e.data as { message: string; hint?: string });
        },
        ac.signal,
      );
    } catch (e) {
      setError({
        message: e instanceof ApiError ? e.message : "שגיאה",
        hint: e instanceof ApiError ? e.hint : undefined,
      });
    } finally {
      setPhase((p) => (p === "done" ? p : "idle"));
      abortRef.current = null;
      void loadEstimate();
    }
  };

  const cancel = () => abortRef.current?.abort();
  const busy = phase === "directing" || phase === "producing";
  const noVoice = !settings.voiceId;

  return (
    <>
      <PageHeader title="הפקת קריינות" subtitle={initial.title}>
        <div className="px-4 pb-3 md:px-6">
          <Link
            href={`/episodes/${initial.id}`}
            className="inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-text"
          >
            <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden />
            לפרק
          </Link>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 md:px-6">
        {noVoice && (
          <div className="rounded-card border border-line-strong bg-accent-soft p-4">
            <p className="text-sm font-medium">עוד לא נבחר קול</p>
            <p className="mt-1 text-sm text-muted">בחר קול בהאזנה לפני ההפקה הראשונה.</p>
            <Link href="/settings/voice" className="mt-3 inline-block">
              <Button size="sm" icon={<Mic2 size={16} aria-hidden />}>
                בחירת קול
              </Button>
            </Link>
          </div>
        )}

        {/* Step 1: director */}
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Clapperboard size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">1. במאי קריינות</h2>
              <p className="mt-0.5 text-sm text-muted">
                Claude הופך את התסריט הכתוב לתסריט מבוצע: משפטים קצרים, מספרים במילים,
                שמות בתעתיק
                {settings.voiceModel === "eleven_v3" ? ", ותגי ביטוי במידה." : "."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant={savedPerformed ? "secondary" : "primary"}
              loading={phase === "directing"}
              disabled={busy}
              onClick={() => void runDirector()}
              icon={
                savedPerformed ? (
                  <RotateCcw size={16} aria-hidden />
                ) : (
                  <Wand2 size={16} aria-hidden />
                )
              }
            >
              {savedPerformed ? "הרץ את הבמאי מחדש" : "הרץ את הבמאי"}
            </Button>
            {phase === "directing" && (
              <Button variant="ghost" onClick={cancel}>
                בטל
              </Button>
            )}
          </div>
          {phase === "directing" && (
            <pre
              ref={liveRef}
              className="mt-3 max-h-48 overflow-y-auto rounded-2xl bg-surface-2 p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap text-text-2"
              aria-live="polite"
            >
              {directorLive || "חושב…"}
            </pre>
          )}
        </section>

        {/* Step 2: review/edit */}
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-base font-semibold">2. התסריט המבוצע</h2>
          <p className="mt-0.5 text-sm text-muted">
            זה מה שיישלח לקריינית. ערוך בחופשיות. שורה ריקה = השהיה.
            {!savedPerformed && " בלי במאי, יישלח התסריט המקורי."}
          </p>
          <textarea
            value={performed}
            onChange={(e) => setPerformed(e.target.value)}
            placeholder={initial.script}
            rows={14}
            disabled={busy}
            dir="rtl"
            className="mt-3 w-full resize-y rounded-2xl border border-line bg-surface-2 p-4 text-[15px] leading-relaxed text-text placeholder:text-muted-2 focus:border-line-strong focus:outline-none disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted">
              {performed.trim().split(/\s+/).filter(Boolean).length} מילים
              {dirty && " · לא נשמר"}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!dirty || busy}
              loading={saving}
              onClick={() => void savePerformed()}
              icon={<Save size={14} aria-hidden />}
            >
              שמור
            </Button>
          </div>
        </section>

        {/* Step 3: estimate + produce */}
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-base font-semibold">3. הפקה</h2>
          {estimate && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <Stat label="תווים" value={estimate.chars.toLocaleString("he-IL")} />
              <Stat label="קטעים" value={String(estimate.chunks)} />
              <Stat
                label="משך משוער"
                value={formatDuration(estimate.estimatedDurationSec) || "—"}
              />
              <Stat
                label="עלות משוערת"
                value={`$${estimate.estimatedCostUsd.toFixed(2)}`}
              />
            </dl>
          )}
          <p className="mt-2 text-xs text-muted">
            קול: {settings.voiceName ?? "לא נבחר"} · מודל: {settings.voiceModel}
            {estimate?.upToDate && " · הקריינות הקיימת מעודכנת"}
          </p>
          {estimate && estimate.needsFfmpeg && !estimate.ffmpeg && (
            <p className="mt-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              הפרק ארוך ודורש תפירה, אבל ffmpeg לא מותקן. {estimate.ffmpegHint}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={noVoice || busy || (estimate?.upToDate ?? false)}
              loading={phase === "producing"}
              onClick={() => void produce(false)}
              icon={<Mic2 size={18} aria-hidden />}
            >
              {initial.audio ? "הפק מחדש" : "הפק קריינות"}
            </Button>
            {estimate?.upToDate && !busy && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void produce(true)}
                icon={<RotateCcw size={16} aria-hidden />}
              >
                הפק בכל זאת
              </Button>
            )}
            {phase === "producing" && (
              <Button variant="ghost" size="lg" onClick={cancel}>
                בטל
              </Button>
            )}
          </div>

          {phase === "producing" && (
            <div
              className="mt-4 rounded-2xl bg-surface-2 p-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm">
                <Loader2 size={16} className="animate-spin text-accent" aria-hidden />
                <span>{progress?.message ?? "מתחיל…"}</span>
              </div>
              {progress && progress.total > 0 && (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${(progress.chunk / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {progress.chunk}/{progress.total}
                    {progress.etaSec != null &&
                      progress.etaSec > 0 &&
                      ` · נותרו כ-${formatDuration(progress.etaSec)}`}
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm"
            >
              <p className="font-medium text-danger">{error.message}</p>
              {error.hint && <p className="mt-1 text-text-2">{error.hint}</p>}
            </div>
          )}

          {result && phase === "done" && (
            <div className="mt-4 rounded-2xl border border-line-strong bg-accent-soft p-4">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={18} className="text-ok" aria-hidden />
                {result.skipped ? "הקריינות הקיימת כבר מעודכנת" : "הקריינות מוכנה"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatDuration(result.durationSec)} ·{" "}
                {(result.sizeBytes / 1024 / 1024).toFixed(1)} MB · {result.model}
              </p>
              <Link href={`/episodes/${initial.id}`} className="mt-3 inline-block">
                <Button icon={<Play size={16} fill="currentColor" aria-hidden />}>
                  לפרק, להאזנה
                </Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-latin font-semibold tabular-nums" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
