"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Heart, Play } from "lucide-react";
import type { EpisodeCard as EpisodeCardData } from "@/lib/schemas/episode";
import { DOMAIN_LABELS } from "@/lib/domains";
import { formatMinutes } from "@/lib/format";
import { CardSvg } from "./CardSvg";

export function EpisodeCard({
  episode,
  index,
}: {
  episode: EpisodeCardData;
  index: number;
}) {
  const reduce = useReducedMotion();
  const progress =
    episode.durationSec && episode.durationSec > 0
      ? Math.min(1, episode.positionSec / episode.durationSec)
      : 0;
  const statusLabel =
    episode.status === "done"
      ? "הושמע"
      : episode.status === "in_progress"
        ? "באמצע"
        : "חדש";

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index, 12) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="list-none"
    >
      <Link
        href={`/episodes/${episode.id}`}
        className="group block rounded-card outline-offset-4"
        aria-label={`${episode.title}, ${episode.author}, ${statusLabel}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-surface shadow-card transition-transform duration-300 ease-(--ease-out-soft) group-hover:-translate-y-0.5 group-active:scale-[0.985]">
          <CardSvg svg={episode.cardSvg} uid={episode.id} className="h-full w-full" />

          {/* Status / progress */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
            <StatusBadge status={episode.status} progress={progress} />
            {episode.favorite && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-accent-2 backdrop-blur-sm">
                <Heart size={14} fill="currentColor" aria-label="מועדף" />
              </span>
            )}
          </div>

          {episode.hasAudio && (
            <span className="absolute start-2.5 top-2.5 flex h-7 items-center gap-1 rounded-pill bg-black/45 px-2 text-[11px] font-medium text-white backdrop-blur-sm">
              <Play size={11} fill="currentColor" aria-hidden />
              {formatMinutes(episode.durationSec)}
            </span>
          )}
        </div>

        <div className="mt-2.5 px-0.5">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-text">
            {episode.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{episode.author}</p>
          <p className="mt-1 text-[11px] font-medium text-accent">
            {DOMAIN_LABELS[episode.domain]}
          </p>
        </div>
      </Link>
    </motion.li>
  );
}

function StatusBadge({
  status,
  progress,
}: {
  status: EpisodeCardData["status"];
  progress: number;
}) {
  if (status === "done") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-ok text-white shadow-sm"
        aria-label="הושמע"
      >
        <Check size={14} strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === "in_progress") {
    const r = 11;
    const c = 2 * Math.PI * r;
    return (
      <span
        className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm"
        aria-label={`באמצע, ${Math.round(progress * 100)} אחוז`}
      >
        <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2.5"
          />
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="var(--accent-2)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="flex h-7 items-center rounded-pill bg-black/45 px-2 text-[11px] font-medium text-accent-2 backdrop-blur-sm"
      aria-label="חדש"
    >
      חדש
    </span>
  );
}
