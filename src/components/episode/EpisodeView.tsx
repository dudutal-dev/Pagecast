"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mic2, Play } from "lucide-react";
import type { EpisodeWithAudio } from "@/server/services/episodes";
import { DOMAIN_LABELS } from "@/lib/domains";
import { formatMinutes } from "@/lib/format";
import { Markdown } from "@/lib/markdown";
import { usePlayer } from "@/store/player";
import { CardSvg } from "@/components/library/CardSvg";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { DockedPlayer } from "@/components/player/DockedPlayer";
import { EpisodeActions } from "./EpisodeActions";
import { TranscriptView } from "./TranscriptView";
import { TakeawaysChecklist } from "./TakeawaysChecklist";
import { NotesEditor } from "./NotesEditor";

type TabKey = "summary" | "script" | "takeaways" | "notes";
const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "תקציר" },
  { key: "script", label: "תסריט" },
  { key: "takeaways", label: "לקחת הביתה" },
  { key: "notes", label: "הערות שלי" },
];

export function EpisodeView({ initial }: { initial: EpisodeWithAudio }) {
  const [ep, setEp] = useState(initial);
  const [tab, setTab] = useState<TabKey>("summary");
  const toast = useToast();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 90]);
  const scale = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 1.08]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.35]);

  const isCurrent = usePlayer((s) => s.track?.episodeId === ep.id);
  const playing = usePlayer((s) => s.playing);
  const load = usePlayer((s) => s.load);
  const seek = usePlayer((s) => s.seek);
  const play = usePlayer((s) => s.play);

  useEffect(() => setEp(initial), [initial]);

  const hasAudio = ep.audio != null;
  const startAt = ep.positionSec >= (ep.audio?.durationSec ?? 0) - 3 ? 0 : ep.positionSec;

  const startPlayback = (from?: number) => {
    if (!ep.audio) return;
    if (!isCurrent) {
      load(
        {
          episodeId: ep.id,
          title: ep.title,
          author: ep.author,
          cardSvg: ep.cardSvg,
          coverUrl: ep.coverUrl,
          durationSec: ep.audio.durationSec,
          startAt: from ?? startAt,
        },
        { autoplay: true },
      );
      if (from != null) window.setTimeout(() => seek(from), 50);
    } else {
      if (from != null) seek(from);
      play();
    }
  };

  const script = ep.performedScript ?? ep.script;
  const domainLabel = DOMAIN_LABELS[ep.domain];

  return (
    <article className={hasAudio && isCurrent ? "pb-52" : "pb-6"}>
      {/* Top bar */}
      <div className="safe-top sticky top-0 z-30 flex items-center justify-between bg-gradient-to-b from-bg to-transparent px-2 pt-2 pb-6">
        <Link
          href="/"
          className="flex h-11 items-center gap-1 rounded-full px-3 text-sm text-text-2 hover:bg-surface/70 hover:text-text"
        >
          <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
          לספרייה
        </Link>
      </div>

      {/* Hero */}
      <div ref={heroRef} className="relative -mt-8 overflow-hidden">
        <motion.div
          style={{ y, scale, opacity }}
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
          aria-hidden
        >
          <CardSvg
            svg={ep.cardSvg}
            uid={`bg-${ep.id}`}
            className="h-full w-full scale-150 opacity-60"
          />
        </motion.div>
        <div className="bg-gradient-to-b from-transparent via-bg/40 to-bg px-6 pt-4 pb-6">
          <motion.div
            layoutId={`cover-${ep.id}`}
            style={{ y: useTransform(y, (v) => v * 0.4) }}
            className="mx-auto w-44 overflow-hidden rounded-card shadow-float sm:w-52"
          >
            {ep.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ep.coverUrl}
                alt={`כריכה: ${ep.title}`}
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <CardSvg svg={ep.cardSvg} uid={ep.id} className="aspect-[3/4] w-full" />
            )}
          </motion.div>
          <p className="mt-2 text-center text-[11px] text-muted-2">
            {ep.coverUrl ? "כריכה" : "איור מקורי"}
          </p>

          <div className="mt-5 text-center">
            <Tag>{domainLabel}</Tag>
            <h1 className="mt-2 text-[26px] leading-tight font-bold tracking-tight">
              {ep.title}
            </h1>
            {ep.titleEn && (
              <p className="mt-0.5 font-latin text-sm text-muted" dir="ltr">
                {ep.titleEn}
              </p>
            )}
            <p className="mt-1 text-[15px] text-text-2">
              {ep.author}
              {ep.year ? ` · ${ep.year}` : ""}
              {ep.kind === "fiction" ? " · ספרות" : ""}
            </p>
          </div>

          {/* The message */}
          <blockquote className="relative mx-auto mt-6 max-w-prose text-center">
            <span
              aria-hidden
              className="absolute start-1/2 -top-4 -translate-x-1/2 font-latin text-5xl leading-none text-accent/40"
            >
              “
            </span>
            <p className="text-[19px] leading-relaxed font-medium text-text">
              {ep.message}
            </p>
          </blockquote>

          {/* Primary CTA */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {hasAudio ? (
              <Button
                size="lg"
                onClick={() => startPlayback()}
                icon={<Play size={18} fill="currentColor" aria-hidden />}
                className="min-w-48"
              >
                {isCurrent && playing
                  ? "מנגן…"
                  : startAt > 0
                    ? `המשך · ${formatMinutes(ep.audio!.durationSec - startAt)} נותרו`
                    : `השמע · ${formatMinutes(ep.audio!.durationSec)}`}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                icon={<Mic2 size={18} aria-hidden />}
                className="min-w-48"
                onClick={() =>
                  toast.info(
                    "הפקת קריינות מגיעה באבן הדרך הבאה",
                    "בינתיים אפשר לקרוא את התקציר והתסריט.",
                  )
                }
              >
                הפק קריינות
              </Button>
            )}
            <EpisodeActions
              episode={ep}
              onChange={(p) => setEp((e) => ({ ...e, ...p }))}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6">
        <Tabs
          items={TABS}
          value={tab}
          onChange={setTab}
          className="sticky top-0 z-20 bg-bg/90 backdrop-blur-xl"
        />
        <div className="mx-auto max-w-2xl pt-5" role="tabpanel">
          {tab === "summary" && (
            <div>
              <Markdown text={ep.summaryMd} />
              {ep.knowledgeToday && (
                <aside className="mt-6 rounded-2xl border border-line-strong bg-accent-soft p-4">
                  <p className="text-xs font-semibold text-accent">מצב הידע היום</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-2">
                    {ep.knowledgeToday}
                  </p>
                </aside>
              )}
              {ep.caveat && (
                <aside className="mt-4 rounded-2xl border border-line bg-surface p-4">
                  <p className="text-xs font-semibold text-muted">הסתייגות</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-2">{ep.caveat}</p>
                </aside>
              )}
            </div>
          )}
          {tab === "script" && (
            <TranscriptView
              episodeId={ep.id}
              script={script}
              hasAudio={hasAudio}
              onPlayFrom={(t) => startPlayback(t)}
            />
          )}
          {tab === "takeaways" && (
            <TakeawaysChecklist
              episodeId={ep.id}
              takeaways={ep.takeaways}
              initialDone={ep.takeawaysDone}
              fiction={ep.kind === "fiction"}
            />
          )}
          {tab === "notes" && <NotesEditor episodeId={ep.id} initial={ep.notes} />}
        </div>
      </div>

      {hasAudio && isCurrent && <DockedPlayer />}
    </article>
  );
}
