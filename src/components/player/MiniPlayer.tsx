"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { CardSvg } from "@/components/library/CardSvg";
import { PlayPauseButton } from "./PlayerControls";

/** Compact bar above the bottom nav, shown everywhere except the current episode's page. */
export function MiniPlayer({ hidden }: { hidden: boolean }) {
  const track = usePlayer((s) => s.track);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const clear = usePlayer((s) => s.clear);
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <AnimatePresence>
      {track && !hidden && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-2 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+8px)] z-40 mx-auto max-w-3xl"
        >
          <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-surface/95 p-2 shadow-float backdrop-blur-xl">
            <Link
              href={`/episodes/${track.episodeId}`}
              className="flex min-w-0 flex-1 items-center gap-3"
              aria-label={`פתח את הפרק ${track.title}`}
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md">
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CardSvg
                    svg={track.cardSvg}
                    uid={`mini-${track.episodeId}`}
                    className="h-full w-full"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{track.title}</p>
                <p className="truncate text-xs text-muted">{track.author}</p>
              </div>
            </Link>
            <PlayPauseButton size="sm" />
            <button
              onClick={clear}
              aria-label="סגור נגן"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
            >
              <X size={16} aria-hidden />
            </button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-3" aria-hidden>
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
